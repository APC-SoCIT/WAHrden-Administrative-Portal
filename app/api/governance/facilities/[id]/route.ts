// UC-FMG-02 update + UC-FMG-03 direct module configuration.
import { NextResponse } from "next/server";
import { audit, db } from "@/lib/db";
import { authorize } from "@/lib/server-access";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => ({}));
  const { name, type, region, status, moduleChanges } = body as {
    name?: string; type?: string; region?: string;
    status?: "Registered" | "Suspended";
    moduleChanges?: { moduleId: string; enabled: boolean }[];
  };
  // Module availability (UC-FMG-03) and facility-information maintenance
  // (UC-FMG-02) are separate responsibilities in V9 — authorize accordingly.
  const gate = authorize(req, moduleChanges ? "UC-FMG-03" : "UC-FMG-02");
  if (!gate.ok) return gate.res;
  const store = db();
  const f = store.facilities.find((x) => x.id === params.id);
  if (!f) return NextResponse.json({ error: "Facility not found (EF-02)." }, { status: 404 });
  if (name) f.name = name;
  if (type) f.type = type;
  if (region) f.region = region;
  if (status) f.status = status;
  f.updatedAt = new Date().toISOString();
  if (moduleChanges) {
    for (const mc of moduleChanges) {
      const row = store.facilityModules.find(
        (m) => m.facilityId === f.id && m.moduleId === mc.moduleId
      );
      if (row) row.enabled = mc.enabled;
      else store.facilityModules.push({ facilityId: f.id, moduleId: mc.moduleId, enabled: mc.enabled });
    }
    audit(gate.actor.email, gate.actor.role, "CONFIGURE_FACILITY_MODULES", "facility-modules", "success", f.id, "UC-FMG-03: direct module configuration applied.");
  } else {
    audit(gate.actor.email, gate.actor.role, "UPDATE_FACILITY_INFO", "facility", "success", f.id, "UC-FMG-02: permitted profile information updated.");
  }
  return NextResponse.json({ facility: f });
}
