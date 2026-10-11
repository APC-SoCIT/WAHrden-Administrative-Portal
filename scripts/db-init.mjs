#!/usr/bin/env node
// Provision MariaDB for WAHrden login credentials (UC-ASS-03).
// Creates the database, the wahrden_credentials table, and seeds the demo
// accounts with bcrypt-hashed passwords. Idempotent — safe to re-run
// (re-running resets demo accounts to the demo password).
//
// Usage:  npm run db:init
// Reads MARIADB_URL from the environment or from .env.local.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

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

const url = process.env.MARIADB_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("MARIADB_URL is not set.");
  console.error('Example: MARIADB_URL="mysql://wahrden:CHANGE_ME@127.0.0.1:3306/wahrden" npm run db:init');
  process.exit(1);
}

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Wahrden!2026";
const DEMO_EMAILS = [
  "maria.santos@wah.example",
  "jose.reyes@manilahc.example",
  "ana.lim@manilahc.example",
  "rita.cruz@cebuch.example"
];

function withSsl(u) {
  const parsed = new URL(u);
  const ssl = parsed.searchParams.get("ssl");
  parsed.searchParams.delete("ssl");
  return {
    uri: parsed.toString(),
    ...(ssl === "true" ? { ssl: { rejectUnauthorized: true } } : {})
  };
}

const parsed = new URL(url);
const dbName = parsed.pathname.replace(/^\//, "") || "wahrden";

// 1. Ensure the database exists (connect without selecting one).
const adminUrl = new URL(url);
adminUrl.pathname = "/";
const admin = await mysql.createConnection(withSsl(adminUrl.toString()));
await admin.query(
  `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
);
await admin.end();
console.log(`Database ready: ${dbName}`);

// 2. Schema.
const conn = await mysql.createConnection(withSsl(url));
await conn.query(`
  CREATE TABLE IF NOT EXISTS wahrden_credentials (
    email        VARCHAR(190) NOT NULL PRIMARY KEY,
    password_hash VARCHAR(100) NOT NULL,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                 ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);
console.log("Table ready: wahrden_credentials");

// 3. Seed demo accounts (bcrypt cost 10).
for (const email of DEMO_EMAILS) {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await conn.query(
    "INSERT INTO wahrden_credentials (email, password_hash) VALUES (?, ?) " +
      "ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)",
    [email, hash]
  );
}

const [rows] = await conn.query(
  "SELECT email, updated_at FROM wahrden_credentials ORDER BY email"
);
console.table(rows);
console.log(`Seeded ${DEMO_EMAILS.length} accounts. Demo password: ${DEMO_PASSWORD}`);
await conn.end();
