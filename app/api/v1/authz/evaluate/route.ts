// UC-AGA-07 — Authorize Service Access.
// Component Diagram: Authorization Controller → Token & Context Guard →
// Policy Decision Engine → Audit Logger Component → Internal Audit Store.
// Fail-closed: insufficient context never yields Authorized.
import { NextResponse } from "next/server";
import { audit, db } from "@/lib/db";
import { authorize } from "@/lib/server-access";
import { evaluateAuthz } from "@/lib/pdp";
import type { AuthzRequest } from "@/lib/types";

export async function POST(req: Request) {
  // Only a Participating WAH Service may invoke runtime authorization (UC-AGA-07).
  const gate = authorize(req, "UC-AGA-07");
  if (!gate.ok) return gate.res;
  const body = (await req.json().catch(() => ({}))) as Partial<AuthzRequest>;
  const store = db();
  const result = evaluateAuthz(store, body as AuthzRequest);
  const ev = audit(
    gate.actor.email,
    gate.actor.role,
    "AUTHORIZE_SERVICE_ACCESS",
    "authz-decision",
    result.decision,
    undefined,
    `UC-AGA-07 ${result.decision}: user=${body.userId} facility=${body.facilityId} action=${body.action} module=${body.moduleId ?? "n/a"}`
  );
  return NextResponse.json({ ...result, audited: true, auditId: ev.id });
}
