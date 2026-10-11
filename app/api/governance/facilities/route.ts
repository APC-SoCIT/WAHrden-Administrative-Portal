// UC-FMG-01 onboard + UC-FMG-02 update + UC-FMG-03 module availability.
import { NextResponse } from "next/server";
import { audit, db, nid } from "@/lib/db";
import { authorize } from "@/lib/server-access";

export async function GET(req: Request) {
  const gate = authorize(req, ["UC-FMG-01", "UC-FMG-02", "UC-FMG-03", "UC-FMG-04", "UC-FMG-05"]);
  if (!gate.ok) return gate.res;
  const store = db();
  return NextResponse.json({
    facilities: store.facilities,
    modules: store.modules,
    facilityModules: store.facilityModules
  });
}

export async function POST(req: Request) {
  const gate = authorize(req, "UC-FMG-01");
  if (!gate.ok) return gate.res;
  const body = await req.json().catch(() => ({}));
  const { name, code, type, region, initialModules } = body as {
    name?: string; code?: string; type?: string; region?: string;
    initialModules?: string[];
  };
  if (!name || !code) {
    return NextResponse.json({ error: "Incomplete or invalid facility information: name and code required (EF-02)." }, { status: 400 });
  }
  const store = db();
  if (store.facilities.some((f) => f.code.toLowerCase() === code.toLowerCase())) {
    return NextResponse.json({ error: "Duplicate or conflicting facility (EF-03)." }, { status: 409 });
  }
  const now = new Date().toISOString();
  const facility = { id: nid("f"), code, name, type: type ?? "Primary Care", region: region ?? "NCR", status: "Registered" as const, updatedAt: now };
  store.facilities.push(facility);
  for (const moduleId of initialModules ?? []) {
    if (store.modules.some((m) => m.id === moduleId)) {
      store.facilityModules.push({ facilityId: facility.id, moduleId, enabled: true });
    }
  }
  audit(gate.actor.email, gate.actor.role, "ONBOARD_FACILITY", "facility", "success", facility.id, `UC-FMG-01: registered ${code}.`);
  return NextResponse.json({ facility }, { status: 201 });
}
