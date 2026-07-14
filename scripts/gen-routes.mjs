// Build-time: scan the app/ folder and write a manifest of every page + API
// endpoint. Because it reads the file structure (which IS the route definition
// in Next.js), the list is always complete and current on each deploy.
import { readdirSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const APP = "app"
const pages = []
const endpoints = []

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) { walk(full); continue }
    if (name !== "page.tsx" && name !== "route.ts") continue

    // Build the URL path from the folder path.
    let rel = dir.slice(APP.length)                 // strip "app"
    rel = rel.replace(/\/\([^)]+\)/g, "")           // strip route groups (portal)
    const isDynamic = /\[[^\]]+\]/.test(rel)         // [id] etc.
    const path = rel === "" ? "/" : rel
    if (name === "page.tsx") pages.push({ path, dynamic: isDynamic })
    else endpoints.push({ path, dynamic: isDynamic })
  }
}

walk(APP)
pages.sort((a, b) => a.path.localeCompare(b.path))
endpoints.sort((a, b) => a.path.localeCompare(b.path))

const manifest = { generatedAt: new Date().toISOString(), pages, endpoints }
writeFileSync("lib/route-manifest.json", JSON.stringify(manifest, null, 2))
console.log(`route-manifest: ${pages.length} pages, ${endpoints.length} endpoints`)
