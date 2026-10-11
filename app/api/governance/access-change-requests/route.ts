// UC-AGA-05 submit + UC-AGA-06 review for facility-user access change.
import { NextResponse } from "next/server";
import { audit, db, nid } from "@/lib/db";
import { authorize } from "@/lib/server-access";
import type { RequestStatus } from "@/lib/types";

export async function GET(req: Request) {
  const gate = authorize(req, ["UC-AGA-05", "UC-AGA-06"]);
  if (!gate.ok) return gate.res;
  return NextResponse.json({ requests: db().accessChangeRequests });
}

export async function POST(req: Request) {
  const gate = authorize(req, "UC-AGA-05");
  if (!gate.ok) return gate.res;
  const body = await req.json().catch(() => ({}));
  const { facilityId, targetUserId, changeKind, roleId, reason } = body;
  const store = db();
  const scoped = store.access.some((a) => a.userId === gate.actor.id && a.facilityId === facilityId);
  if (!scoped) return NextResponse.json({ error: "Insufficient facility authority or out-of-scope change (EF-01/EF-04)." }, { status: 403 });
  if (!targetUserId || !changeKind) {
    return NextResponse.json({ error: "Invalid or incomplete access change (EF-03)." }, { status: 400 });
  }
  const r = {
    id: nid("acr"), facilityId, targetUserId, requestedBy: gate.actor.id, changeKind,
    roleId, reason, status: "Pending" as RequestStatus, createdAt: new Date().toISOString()
  };
  store.accessChangeRequests.unshift(r);
  audit(gate.actor.email, gate.actor.role, "REQUEST_ACCESS_CHANGE", "access-change-request", "success", r.id, "UC-AGA-05: Pending; existing access unchanged.");
  return NextResponse.json({ request: r }, { status: 201 });
}
