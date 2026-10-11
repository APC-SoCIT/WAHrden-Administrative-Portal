import { NextResponse } from "next/server";
import { audit, db } from "@/lib/db";
import { authorize } from "@/lib/server-access";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const gate = authorize(req, "UC-AGA-06");
  if (!gate.ok) return gate.res;
  const body = await req.json().catch(() => ({}));
  const { decision, modifications } = body as {
    decision?: "Approve" | "ModifyAndApprove" | "Reject";
    modifications?: { roleId?: string; changeKind?: "GRANT" | "MODIFY" | "REVOKE" };
  };
  const store = db();
  const r = store.accessChangeRequests.find((x) => x.id === params.id);
  if (!r) return NextResponse.json({ error: "Selected request unavailable or no longer Pending (EF-03)." }, { status: 404 });
  if (r.status !== "Pending") {
    return NextResponse.json({ error: `Decision no longer applicable: ${r.status} (EF-06).`, request: r }, { status: 409 });
  }
  if (!decision) return NextResponse.json({ error: "A review decision is required." }, { status: 400 });
  if (decision === "ModifyAndApprove") {
    if (modifications?.roleId) r.roleId = modifications.roleId;
    if (modifications?.changeKind) r.changeKind = modifications.changeKind;
    r.status = "ApprovedModified";
  } else if (decision === "Approve") {
    r.status = "Approved";
  } else {
    r.status = "Rejected";
  }
  r.decisionBy = gate.actor.id;
  r.decidedAt = new Date().toISOString();
  audit(gate.actor.email, gate.actor.role, "REVIEW_ACCESS_CHANGE_REQUEST", "access-change-request", "success", r.id, `UC-AGA-06: ${decision} → ${r.status}. Approval does not alter access; apply via UC-AGA-02.`);
  return NextResponse.json({ request: r });
}
