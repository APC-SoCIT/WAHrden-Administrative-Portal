// Client-side administration-portal session (localStorage).
// The session stores the actor identity returned by /api/portal/login; the
// client attaches the user id as `x-wahrden-actor` so the server can re-derive
// the role and enforce per-actor access on every request.
import type { PortalActorRole } from "./access";

export interface PortalSession {
  userId: string;
  role: PortalActorRole;
  displayName: string;
  email: string;
}

const KEY = "wahrden-portal-session";

export function getSession(): PortalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PortalSession) : null;
  } catch {
    return null;
  }
}

export function setSession(session: PortalSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
