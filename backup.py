#!/usr/bin/env python3
"""Nightly backup: Supabase Postgres dump + Storage files -> Dropbox.

All configuration is read from a single environment variable BACKUP_CONFIG,
which is a JSON object with these keys:
  db_url            Postgres connection URI (session pooler, password url-encoded)
  supabase_url      https://<ref>.supabase.co
  service_role_key  Supabase service_role key (reads private Storage)
  dbx_key           Dropbox app key
  dbx_secret        Dropbox app secret
  dbx_refresh       Dropbox refresh token (long-lived)
  buckets           comma-separated Storage bucket names
  retention_days    how many days of backups to keep in Dropbox
"""
import os, sys, json, time, datetime, subprocess
import requests

cfg = json.loads(os.environ["BACKUP_CONFIG"])
DB_URL = cfg["db_url"]
SB_URL = cfg["supabase_url"].rstrip("/")
SRK = cfg["service_role_key"]
DBX_KEY = cfg["dbx_key"]
DBX_SECRET = cfg["dbx_secret"]
DBX_RT = cfg["dbx_refresh"]
BUCKETS = [b.strip() for b in str(cfg.get("buckets", "")).split(",") if b.strip()]
RETENTION = int(cfg.get("retention_days", 30))

STAMP = datetime.datetime.utcnow().strftime("%Y-%m-%d_%H%M")
FOLDER = f"/backup_{STAMP}"  # relative to the Dropbox App-folder root


def log(*a):
    print("[backup]", *a, flush=True)


# ---------- Dropbox helpers ----------
def dbx_access_token():
    r = requests.post(
        "https://api.dropboxapi.com/oauth2/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": DBX_RT,
            "client_id": DBX_KEY,
            "client_secret": DBX_SECRET,
        },
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["access_token"]


AT = dbx_access_token()
CHUNK = 8 * 1024 * 1024


def dbx_upload(local_path, dropbox_path):
    size = os.path.getsize(local_path)
    with open(local_path, "rb") as f:
        if size <= CHUNK:
            data = f.read()
            r = requests.post(
                "https://content.dropboxapi.com/2/files/upload",
                headers={
                    "Authorization": "Bearer " + AT,
                    "Dropbox-API-Arg": json.dumps(
                        {"path": dropbox_path, "mode": "overwrite", "mute": True}
                    ),
                    "Content-Type": "application/octet-stream",
                },
                data=data,
                timeout=300,
            )
            r.raise_for_status()
            return
        # chunked session for large files
        first = f.read(CHUNK)
        r = requests.post(
            "https://content.dropboxapi.com/2/files/upload_session/start",
            headers={
                "Authorization": "Bearer " + AT,
                "Dropbox-API-Arg": json.dumps({"close": False}),
                "Content-Type": "application/octet-stream",
            },
            data=first,
            timeout=300,
        )
        r.raise_for_status()
        sid = r.json()["session_id"]
        offset = len(first)
        while True:
            chunk = f.read(CHUNK)
            if not chunk:
                break
            cursor = {"session_id": sid, "offset": offset}
            if len(chunk) < CHUNK:
                r = requests.post(
                    "https://content.dropboxapi.com/2/files/upload_session/finish",
                    headers={
                        "Authorization": "Bearer " + AT,
                        "Dropbox-API-Arg": json.dumps(
                            {
                                "cursor": cursor,
                                "commit": {
                                    "path": dropbox_path,
                                    "mode": "overwrite",
                                    "mute": True,
                                },
                            }
                        ),
                        "Content-Type": "application/octet-stream",
                    },
                    data=chunk,
                    timeout=300,
                )
                r.raise_for_status()
                offset += len(chunk)
                break
            else:
                r = requests.post(
                    "https://content.dropboxapi.com/2/files/upload_session/append_v2",
                    headers={
                        "Authorization": "Bearer " + AT,
                        "Dropbox-API-Arg": json.dumps({"cursor": cursor, "close": False}),
                        "Content-Type": "application/octet-stream",
                    },
                    data=chunk,
                    timeout=300,
                )
                r.raise_for_status()
                offset += len(chunk)


# ---------- 1. Database dump ----------
dump_name = f"db_{STAMP}.dump"
log("dumping database ...")
subprocess.run(
    ["pg_dump", DB_URL, "-Fc", "--no-owner", "--no-privileges", "-f", dump_name],
    check=True,
)
log("db dump size (bytes):", os.path.getsize(dump_name))
dbx_upload(dump_name, f"{FOLDER}/{dump_name}")
log("uploaded db dump")


# ---------- 2. Storage buckets ----------
def list_objects(bucket, prefix=""):
    out = []
    limit, offset = 100, 0
    while True:
        r = requests.post(
            f"{SB_URL}/storage/v1/object/list/{bucket}",
            headers={"Authorization": "Bearer " + SRK, "apikey": SRK,
                     "Content-Type": "application/json"},
            json={"prefix": prefix, "limit": limit, "offset": offset,
                  "sortBy": {"column": "name", "order": "asc"}},
            timeout=120,
        )
        r.raise_for_status()
        items = r.json()
        if not items:
            break
        for it in items:
            name = it.get("name")
            if it.get("id") is None and it.get("metadata") is None:
                sub = (prefix + "/" + name).strip("/")
                out.extend(list_objects(bucket, sub))
            else:
                out.append((prefix + "/" + name).strip("/"))
        if len(items) < limit:
            break
        offset += limit
    return out


for bucket in BUCKETS:
    log("backing up bucket:", bucket)
    try:
        keys = list_objects(bucket)
    except Exception as e:
        log("!! could not list bucket", bucket, repr(e))
        continue
    log(f"  {len(keys)} objects")
    for key in keys:
        dl = requests.get(
            f"{SB_URL}/storage/v1/object/{bucket}/{key}",
            headers={"Authorization": "Bearer " + SRK, "apikey": SRK},
            timeout=300,
        )
        if dl.status_code != 200:
            log("  skip", bucket, key, dl.status_code)
            continue
        with open("obj.bin", "wb") as w:
            w.write(dl.content)
        dbx_upload("obj.bin", f"{FOLDER}/storage/{bucket}/{key}")


# ---------- 3. Retention: delete old backup_* folders ----------
try:
    r = requests.post(
        "https://api.dropboxapi.com/2/files/list_folder",
        headers={"Authorization": "Bearer " + AT, "Content-Type": "application/json"},
        json={"path": ""},
        timeout=120,
    )
    if r.status_code == 200:
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=RETENTION)
        for e in r.json().get("entries", []):
            n = e.get("name", "")
            if e.get(".tag") == "folder" and n.startswith("backup_"):
                try:
                    d = datetime.datetime.strptime(n[7:17], "%Y-%m-%d")
                except Exception:
                    continue
                if d < cutoff:
                    requests.post(
                        "https://api.dropboxapi.com/2/files/delete_v2",
                        headers={"Authorization": "Bearer " + AT,
                                 "Content-Type": "application/json"},
                        json={"path": e["path_lower"]},
                        timeout=120,
                    )
                    log("deleted old backup:", n)
except Exception as e:
    log("retention step warning:", repr(e))

log("BACKUP COMPLETE ->", FOLDER)
