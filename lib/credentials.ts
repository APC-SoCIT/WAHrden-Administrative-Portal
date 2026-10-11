// Login credential backend (UC-ASS-03 authenticate, UC-ASS-01 change).
// - MariaDB when MARIADB_URL is set (schema + rows created by scripts/db-init.mjs).
// - In-memory bcrypt fallback otherwise, seeded with the demo password, so the
//   password check behaves identically before a database exists.
// Fail-closed: any lookup/DB error rejects the login (EF-01).
import bcrypt from "bcryptjs";
import mysql, { type Pool } from "mysql2/promise";

export const DEMO_PASSWORD = "Wahrden!2026";

const DEMO_EMAILS = [
  "maria.santos@wah.example",
  "jose.reyes@manilahc.example",
  "service.wah4pc@services.wah.example",
  "ana.lim@manilahc.example",
  "rita.cruz@cebuch.example"
];

declare global {
  // eslint-disable-next-line no-var
  var __wahrden_pool: Pool | null | undefined;
  // eslint-disable-next-line no-var
  var __wahrden_cred: Map<string, string> | undefined;
}

function getPool(): Pool | null {
  if (globalThis.__wahrden_pool !== undefined) return globalThis.__wahrden_pool;
  const url = process.env.MARIADB_URL || process.env.DATABASE_URL;
  let pool: Pool | null = null;
  if (url) {
    try {
      const u = new URL(url);
      const sslParam = u.searchParams.get("ssl");
      u.searchParams.delete("ssl");
      pool = mysql.createPool({
        uri: u.toString(),
        connectionLimit: 5,
        ...(sslParam === "true" ? { ssl: { rejectUnauthorized: true } } : {})
      });
    } catch (e) {
      console.error("credentials: invalid MARIADB_URL, failing closed", e);
      pool = null;
    }
  }
  globalThis.__wahrden_pool = pool;
  return pool;
}

export function credentialsBackend(): "mariadb" | "memory" {
  return getPool() ? "mariadb" : "memory";
}

function memoryStore(): Map<string, string> {
  if (!globalThis.__wahrden_cred) {
    const m = new Map<string, string>();
    const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
    for (const email of DEMO_EMAILS) m.set(email, hash);
    globalThis.__wahrden_cred = m;
  }
  return globalThis.__wahrden_cred;
}

export async function verifyCredential(email: string, password: string): Promise<boolean> {
  if (!email || !password) return false;
  const key = email.toLowerCase();
  const pool = getPool();
  if (pool) {
    try {
      const [rows] = await pool.query(
        "SELECT password_hash FROM wahrden_credentials WHERE email = ?",
        [key]
      );
      const row = (rows as { password_hash: string }[])[0];
      if (!row) return false;
      return await bcrypt.compare(password, row.password_hash);
    } catch (e) {
      console.error("credentials: MariaDB verify failed (fail closed)", e);
      return false;
    }
  }
  const hash = memoryStore().get(key);
  return hash ? await bcrypt.compare(password, hash) : false;
}

export async function setCredential(email: string, password: string): Promise<void> {
  const key = email.toLowerCase();
  const hash = await bcrypt.hash(password, 10);
  const pool = getPool();
  if (pool) {
    await pool.query(
      "INSERT INTO wahrden_credentials (email, password_hash) VALUES (?, ?) " +
        "ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)",
      [key, hash]
    );
    return;
  }
  memoryStore().set(key, hash);
}
