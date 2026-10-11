// In-memory governance store (prototype stand-in for PostgreSQL + Redis).
// Vercel-safe: module-global with globalThis pinning so dev HMR keeps state;
// serverless instances each get their own copy (documented demo limitation).
import { buildSeed, type Seed } from "./seed";
import type { AuditEvent } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __wahrden_db: Seed | undefined;
}

export function db(): Seed {
  if (!globalThis.__wahrden_db) globalThis.__wahrden_db = buildSeed();
  return globalThis.__wahrden_db;
}

export function resetDb(): Seed {
  globalThis.__wahrden_db = buildSeed();
  return globalThis.__wahrden_db;
}

let seq = 10000;
export function nid(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

export function audit(
  actor: string,
  actorRole: string,
  action: string,
  entity: string,
  result: string,
  entityId?: string,
  detail?: string
): AuditEvent {
  const store = db();
  const ev: AuditEvent = {
    id: nid("audit"),
    at: new Date().toISOString(),
    actor,
    actorRole,
    action,
    entity,
    entityId,
    result,
    detail
  };
  store.audit.unshift(ev);
  return ev;
}
