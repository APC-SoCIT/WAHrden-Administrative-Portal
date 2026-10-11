// UC-AGA-03 submit + UC-AGA-04 review (Approve / Modify-and-Approve / Reject).
// Review NEVER creates accounts or assigns access (V9 separation rule).
import { NextResponse } from "next/server";
import { audit, db, nid } from "@/lib/db";
import { authorize } from "@/lib/server-access";
import type { RequestStatus } from "@/lib/types";

export async function GET(req: Request) {
  const gate = authorize(req, ["UC-AGA-03", "UC-AGA-04"]);
  if (!gate.ok) return gate.res;
  return NextResponse.json({ requests: db().onboardingRequests });
}

export async function POST(req: Request) {
  const gate = authorize(req, "UC-AGA-03");
  if (!gate.ok) return gate.res;
  const body = await req.json().catch(() => ({}));
  const { facilityId, prospectiveName, prospectiveEmail, requestedRoleId, reason } = body;
  const store = db();
  // The requester is always the authenticated actor — never trusted from the body.
  const admin = store.users.find((u) => u.id === gate.actor.id);
  if (!admin) return NextResponse.json({ error: "Insufficient facility authority: unknown requester (EF-01)." }, { status: 403 });
  const scoped = store.access.some((a) => a.userId === gate.actor.id && a.facilityId === facilityId);
  if (!scoped) {
    return NextResponse.json({ error: "Request outside authorized facility scope (EF-03)." }, { status: 403 });
  }
  if (!prospectiveName || !prospectiveEmail?.includes("@") || !requestedRoleId) {
    return NextResponse.json({ error: "Incomplete or invalid onboarding information (EF-02)." }, { status: 400 });
  }
  const r = {
    id: nid("obr"), facilityId, requestedBy: gate.actor.id, prospectiveName, prospectiveEmail,
    requestedRoleId, reason, status: "Pending" as RequestStatus, createdAt: new Date().toISOString()
  };
  store.onboardingRequests.unshift(r);
  audit(gate.actor.email, gate.actor.role, "REQUEST_FACILITY_USER_ONBOARDING", "onboarding-request", "success", r.id, "UC-AGA-03: placed into Pending; no account created.");
  return NextResponse.json({ request: r }, { status: 201 });
}
