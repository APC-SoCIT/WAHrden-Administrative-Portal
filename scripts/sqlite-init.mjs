#!/usr/bin/env node
// Provision the local SQLite credential store for WAHrden sign-in (UC-ASS-03):
// creates data/wahrden.sqlite with the `wahrden_credentials` table and seeds
// the demo portal accounts as bcrypt hashes. Idempotent — re-running resets
// the demo accounts to the given password.
//
// Usage:  npm run db:init
// Password precedence: SQLITE_DEMO_PASSWORD env, else the built-in demo
// password shown below (presentation default). Override it if you prefer.
import bcrypt from "bcryptjs";
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(root, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const v = m[2].trim().replace(/^["']|["']$/g, "");
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

const DB_PATH = process.env.SQLITE_PATH || join(root, "data", "wahrden.sqlite");
const DEMO_PASSWORD = process.env.SQLITE_DEMO_PASSWORD || "Wahrden!2026";

// Keep ids/emails in sync with lib/seed.ts so the portal session resolves to
// the same governed identity in the in-memory governance store.
const ACCOUNTS = [
  { id: "u-central-1", email: "maria.santos@wah.example", displayName: "Maria Santos", portalRole: "WAH Central Administrator" },
  { id: "u-facility-1", email: "jose.reyes@manilahc.example", displayName: "Jose Reyes", portalRole: "Facility Administrator" },
  { id: "u-service-1", email: "service.wah4pc@services.wah.example", displayName: "WAH4PC Service", portalRole: "Participating WAH Service" },
  { id: "u-doctor-1", email: "ana.lim@manilahc.example", displayName: "Dr. Ana Lim", portalRole: "WAH Service User", status: "Active" },
  { id: "u-nurse-1", email: "rita.cruz@cebuch.example", displayName: "Rita Cruz", portalRole: "WAH Service User", status: "Inactive" }
];

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS wahrden_credentials (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name  TEXT NOT NULL,
    portal_role   TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'Active',
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const upsert = db.prepare(`
  INSERT INTO wahrden_credentials (id, email, password_hash, display_name, portal_role, status, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(id) DO UPDATE SET
    email = excluded.email,
    password_hash = excluded.password_hash,
    display_name = excluded.display_name,
    portal_role = excluded.portal_role,
    status = excluded.status,
    updated_at = datetime('now')
`);

for (const a of ACCOUNTS) {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  upsert.run(a.id, a.email, hash, a.displayName, a.portalRole, a.status ?? "Active");
}

const rows = db.prepare("SELECT id, email, display_name, portal_role, status FROM wahrden_credentials ORDER BY id").all();
db.close();

console.log(`SQLite store ready: ${DB_PATH}`);
console.table(rows);
console.log(`Seeded ${ACCOUNTS.length} accounts. Demo password: ${DEMO_PASSWORD}`);
console.log("(Override with SQLITE_DEMO_PASSWORD=\"...\" npm run db:init)");