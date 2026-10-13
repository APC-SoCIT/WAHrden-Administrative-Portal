// Login credential backend (UC-ASS-03 authenticate) backed by a local SQLite
// file (data/wahrden.sqlite). No password is stored in code: the file holds
// bcrypt hashes and the portal account rows (usernames/roles/status), created
// by scripts/sqlite-init.mjs. Any lookup failure rejects the login (EF-01).
import bcrypt from "bcryptjs";
import { credentialsDb } from "./sqlite";

export interface PortalAccount {
  id: string;
  email: string;
  display_name: string;
  portal_role: string;
  status: string;
}

export function credentialsBackend(): "sqlite" | "unconfigured" {
  return credentialsDb() ? "sqlite" : "unconfigured";
}

export async function verifyCredential(email: string, password: string): Promise<boolean> {
  if (!email || !password) return false;
  const db = credentialsDb();
  if (!db) return false;
  try {
    const row = db
      .prepare("SELECT password_hash FROM wahrden_credentials WHERE email = ?")
      .get(email.toLowerCase()) as { password_hash: string } | undefined;
    if (!row) return false;
    return await bcrypt.compare(password, row.password_hash);
  } catch (e) {
    console.error("credentials: SQLite verify failed (fail closed)", e);
    return false;
  }
}

// Username / role / status lookup for the sign-in session.
export function portalAccount(email: string): PortalAccount | null {
  const db = credentialsDb();
  if (!db) return null;
  try {
    const row = db
      .prepare(
        "SELECT id, email, display_name, portal_role, status " +
          "FROM wahrden_credentials WHERE email = ?"
      )
      .get(email.toLowerCase()) as PortalAccount | undefined;
    return row ?? null;
  } catch (e) {
    console.error("credentials: SQLite account lookup failed (fail closed)", e);
    return null;
  }
}