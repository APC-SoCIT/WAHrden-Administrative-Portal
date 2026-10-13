// Module 5 (OSO): UC-OSO-01 review (filterable audit) + UC-OSO-02 report generation.
import { NextResponse } from "next/server";
import { audit, db } from "@/lib/db";
import { authorize } from "@/lib/server-access";

export async function GET(req: Request) {
  const gate = authorize(req, ["UC-OSO-01", "UC-OSO-02"]);
  if (!gate.ok) return gate.res;
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").toLowerCase();
  const action = searchParams.get("action") ?? "";
  const result = searchParams.get("result") ?? "";
  const actor = (searchParams.get("actor") ?? "").toLowerCase();
  const facilityId = searchParams.get("facilityId") ?? "";
  const store = db();
  let events = store.audit;
  if (q) {
    events = events.filter((e) =>
      [e.actor, e.action, e.entity, e.detail ?? "", e.entityId ?? ""].join(" ").toLowerCase().includes(q)
    );
  }
  if (actor) events = events.filter((e) => e.actor.toLowerCase().includes(actor));
  if (facilityId) events = events.filter((e) => (e.detail ?? "").includes(facilityId) || (e.entityId ?? "").includes(facilityId));
  if (action) events = events.filter((e) => e.action === action);
  if (result === "success") events = events.filter((e) => e.result === "success" || e.result === "Authorized");
  else if (result === "failed") events = events.filter((e) => e.result === "failure" || e.result === "Denied");
  else if (result) events = events.filter((e) => e.result === result);
  return NextResponse.json({ events, total: events.length });
}

export async function POST(req: Request) {
  // UC-OSO-02: generate an operational report from already-maintained info.
  const gate = authorize(req, "UC-OSO-02");
  if (!gate.ok) return gate.res;
  const body = await req.json().catch(() => ({}));
  const { scope, from, to, facilityId } = body as {
    scope?: "authz" | "governance" | "sessions" | "all";
    from?: string; to?: string; facilityId?: string;
  };
  const store = db();
  let events = store.audit;
  if (from) events = events.filter((e) => e.at >= from);
  if (to) events = events.filter((e) => e.at <= to);
  if (facilityId) events = events.filter((e) => (e.detail ?? "").includes(facilityId));
  const want = scope ?? "all";
  if (want !== "all") {
    const map: Record<string, string[]> = {
      authz: ["AUTHORIZE_SERVICE_ACCESS"],
      governance: ["CREATE_USER_ACCOUNT", "CHANGE_USER_ACCOUNT_STATUS", "CONFIGURE_ROLE", "ASSIGN_USER_ACCESS", "MODIFY_USER_ACCESS", "REVOKE_USER_ACCESS", "REVIEW_ONBOARDING_REQUEST", "REVIEW_ACCESS_CHANGE_REQUEST", "ONBOARD_FACILITY", "UPDATE_FACILITY_INFO", "CONFIGURE_FACILITY_MODULES", "REVIEW_MODULE_CHANGE_REQUEST"],
      sessions: ["AUTHENTICATE_USER", "TERMINATE_ACTIVE_SESSION"]
    };
    events = events.filter((e) => (map[want] ?? []).includes(e.action));
  }
  if (events.length === 0) {
    return NextResponse.json({ error: "No applicable information for the selected scope/criteria (EF-03). Revise the report criteria." }, { status: 404 });
  }
  const byAction: Record<string, number> = {};
  const byResult: Record<string, number> = {};
  for (const e of events) {
    byAction[e.action] = (byAction[e.action] ?? 0) + 1;
    byResult[e.result] = (byResult[e.result] ?? 0) + 1;
  }
  const report = {
    generatedAt: new Date().toISOString(),
    scope: want,
    criteria: { from, to, facilityId },
    totals: { events: events.length },
    byAction,
    byResult,
    sample: events.slice(0, 50)
  };
  audit(gate.actor.email, gate.actor.role, "GENERATE_OPERATIONAL_REPORT", "report", "success", undefined, `UC-OSO-02: ${want} report, ${events.length} event(s).`);
  return NextResponse.json({ report });
}
