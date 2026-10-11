// UC-FMG-04 submit + UC-FMG-05 review. Review approval authorizes but does
// NOT auto-apply the configuration (applied separately via UC-FMG-03).
import { NextResponse } from "next/server";
import { audit, db, nid } from "@/lib/db";
import { authorize } from "@/lib/server-access";
import type { RequestStatus } from "@/lib/types";

export async function GET(req: Request) {
  const gate = authorize(req, ["UC-FMG-04", "UC-FMG-05"]);
  if (!gate.ok) return gate.res;
  return NextResponse.json({ requests: db().moduleChangeRequests });
}

export async function POST(req: Request) {
  const gate = authorize(req, "UC-FMG-04");
  if (!gate.ok) return gate.res;
  const body = await req.json().catch(() => ({}));
  const { facilityId, moduleId, desiredEnabled, reason } = body;
  const store = db();
  const scoped = store.access.some((a) => a.userId === gate.actor.id && a.facilityId === facilityId);
  if (!scoped) return NextResponse.json({ error: "Insufficient authority or out-of-scope change (EF-01/EF-03)." }, { status: 403 });
  if (!facilityId || !moduleId || typeof desiredEnabled !== "boolean") {
    return NextResponse.json({ error: "Incomplete or invalid request information (EF-02)." }, { status: 400 });
  }
  const r = {
    id: nid("mcr"), facilityId, moduleId, desiredEnabled, requestedBy: gate.actor.id,
    reason, status: "Pending" as RequestStatus, createdAt: new Date().toISOString()
  };
  store.moduleChangeRequests.unshift(r);
  audit(gate.actor.email, gate.actor.role, "REQUEST_MODULE_CHANGE", "module-change-request", "success", r.id, "UC-FMG-04: Pending; module availability unchanged.");
  return NextResponse.json({ request: r }, { status: 201 });
}
