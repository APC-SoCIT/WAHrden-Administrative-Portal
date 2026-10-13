// SQLite credential store (UC-ASS-03) — presentations use a local file so no
// external database is required. Path: data/wahrden.sqlite by default, or
// $SQLITE_PATH. Created + seeded by scripts/sqlite-init.mjs.
// Fail-closed: a missing file/table or any query error rejects the login.
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

declare global {
  // eslint-disable-next-line no-var
  var __wahrden_sqlite: DatabaseSync | null | undefined;
}

function dbPath(): string {
  return process.env.SQLITE_PATH || join(process.cwd(), "data", "wahrden.sqlite");
}

export function credentialsDb(): DatabaseSync | null {
  if (globalThis.__wahrden_sqlite !== undefined) return globalThis.__wahrden_sqlite;
  let db: DatabaseSync | null = null;
  try {
    db = new DatabaseSync(dbPath());
  } catch (e) {
    console.error("credentials: failed to open SQLite store (fail closed)", e);
    db = null;
  }
  globalThis.__wahrden_sqlite = db;
  return db;
}