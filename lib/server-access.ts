// Server-side portal authorization. Every route derives the acting portal actor
// from the `x-wahrden-actor` request header (a user id set by the portal client),
// resolves the actor's role from the governance store, and checks the use-case
// capability against the V9 access model in lib/access.ts.
//
// A WAH Service User (or an unknown/absent actor) is refused, and a portal actor
// without the required capability receives 403 — so the portal's per-actor
// differences are enforced, not merely hidden in the UI.
import { NextResponse } from "next/server";
import { db } from "./db";
import {
  can,
  canAny,
  isPortalRole,
  PORTAL_ACCESS_ROLES,
  type Capability,
  type PortalActorRole
} from "./access";

export interface PortalActor {
  id: string;
  email: string;
  displayName: string;
  role: PortalActorRole;
}

export function resolveActor(req: Request): PortalActor | null {
  const id = req.headers.get("x-wahrden-actor");
  if (!id) return null;
  const user = db().users.find((u) => u.id === id);
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.portalRole
  };
}

type Gate = { ok: true; actor: PortalActor } | { ok: false; res: NextResponse };

export function requirePortal(req: Request): Gate {
  const actor = resolveActor(req);
  if (!actor) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "Authentication required: sign in to the administration portal (401)." },
        { status: 401 }
      )
    };
  }
  if (!isPortalRole(actor.role) || !PORTAL_ACCESS_ROLES.includes(actor.role)) {
    return {
      ok: false,
      res: NextResponse.json(
        {
          error:
            "Access denied: WAH Service User accounts cannot access the WAHrden administration portal (403)."
        },
        { status: 403 }
      )
    };
  }
  return { ok: true, actor };
}

export function authorize(req: Request, required: Capability | Capability[]): Gate {
  const base = requirePortal(req);
  if (!base.ok) return base;
  const caps = Array.isArray(required) ? required : [required];
  const allowed = caps.length === 1 ? can(base.actor.role, caps[0]) : canAny(base.actor.role, caps);
  if (!allowed) {
    return {
      ok: false,
      res: NextResponse.json(
        {
          error: `Access denied: ${base.actor.role} is not authorized for ${caps.join(
            " / "
          )} (403).`
        },
        { status: 403 }
      )
    };
  }
  return base;
}
