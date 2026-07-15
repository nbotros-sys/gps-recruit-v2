-- Serverless-safe rate limiter (H3). One shared counter in Postgres so it works
-- across all serverless invocations. No external service.

create table if not exists public.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (bucket, window_start)
);

-- Not exposed to the API roles; only the service role / SECURITY DEFINER fn touch it.
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Atomically bump the counter for the current time window and report whether
-- the caller is still within the limit. Returns true = allowed, false = over.
create or replace function public.rate_limit_hit(
  p_bucket text,
  p_window_seconds int,
  p_limit int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c int;
begin
  insert into public.rate_limits (bucket, window_start, count)
  values (p_bucket, w, 1)
  on conflict (bucket, window_start)
    do update set count = public.rate_limits.count + 1
  returning count into c;

  -- opportunistic cleanup of stale windows (cheap, only on a fresh window)
  if c = 1 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return c <= p_limit;
end $$;

-- Allow the app's roles to call the function (the function itself is the only
-- thing that can read/write the table, via SECURITY DEFINER).
grant execute on function public.rate_limit_hit(text, int, int) to anon, authenticated, service_role;
