import { NextResponse } from "next/server";
import { audit, db } from "@/lib/db";
import { authorize } from "@/lib/server-access";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const gate = authorize(req, "UC-FMG-05");
  if (!gate.ok) return gate.res;
  const body = await req.json().catch(() => ({}));
  const { decision } = body as {
    decision?: "Approve" | "ModifyAndApprove" | "Reject";
  };
  const store = db();
  const r = store.moduleChangeRequests.find((x) => x.id === params.id);
  if (!r) return NextResponse.json({ error: "Selected request unavailable (EF-03)." }, { status: 404 });
  if (r.status !== "Pending") {
    return NextResponse.json({ error: `Request no longer Pending: ${r.status} (EF-04).`, request: r }, { status: 409 });
  }
  if (!decision) return NextResponse.json({ error: "A review decision is required." }, { status: 400 });
  r.status = decision === "Reject" ? "Rejected" : decision === "ModifyAndApprove" ? "ApprovedModified" : "Approved";
  r.decisionBy = gate.actor.id;
  r.decidedAt = new Date().toISOString();
  audit(gate.actor.email, gate.actor.role, "REVIEW_MODULE_CHANGE_REQUEST", "module-change-request", "success", r.id, `UC-FMG-05: ${decision} → ${r.status}. Configuration applied separately via UC-FMG-03.`);
  return NextResponse.json({ request: r });
}
