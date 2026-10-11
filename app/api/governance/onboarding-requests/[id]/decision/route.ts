import { NextResponse } from "next/server";
import { audit, db } from "@/lib/db";
import { authorize } from "@/lib/server-access";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const gate = authorize(req, "UC-AGA-04");
  if (!gate.ok) return gate.res;
  const body = await req.json().catch(() => ({}));
  const { decision, modifications } = body as {
    decision?: "Approve" | "ModifyAndApprove" | "Reject";
    modifications?: { prospectiveName?: string; requestedRoleId?: string };
  };
  const store = db();
  const r = store.onboardingRequests.find((x) => x.id === params.id);
  if (!r) return NextResponse.json({ error: "Request unavailable or no longer Pending (EF-02)." }, { status: 404 });
  if (r.status !== "Pending") {
    return NextResponse.json({ error: `Decision no longer applicable: request is ${r.status} (EF-05).`, request: r }, { status: 409 });
  }
  if (!decision) return NextResponse.json({ error: "A review decision is required." }, { status: 400 });
  if (decision === "ModifyAndApprove") {
    if (modifications?.prospectiveName) r.prospectiveName = modifications.prospectiveName;
    if (modifications?.requestedRoleId) r.requestedRoleId = modifications.requestedRoleId;
    r.status = "ApprovedModified";
  } else if (decision === "Approve") {
    r.status = "Approved";
  } else {
    r.status = "Rejected";
  }
  r.decisionBy = gate.actor.id;
  r.decidedAt = new Date().toISOString();
  audit(gate.actor.email, gate.actor.role, "REVIEW_ONBOARDING_REQUEST", "onboarding-request", "success", r.id, `UC-AGA-04: ${decision} → ${r.status}. Governance decision only; account/access must be created via UC-IAL-01/UC-AGA-02.`);
  return NextResponse.json({ request: r });
}
