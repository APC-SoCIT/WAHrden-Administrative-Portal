// Role-scoped overview for the administration-portal dashboard.
// Returns only the counts the acting actor is authorized to see, plus the
// facilities a Facility Administrator is scoped to.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePortal } from "@/lib/server-access";
import { can, capabilitiesFor, type Capability } from "@/lib/access";

export async function GET(req: Request) {
  const gate = requirePortal(req);
  if (!gate.ok) return gate.res;
  const { id, role } = gate.actor;
  const store = db();

  const scopedFacilityIds = store.access
    .filter((a) => a.userId === id)
    .map((a) => a.facilityId);
  const inScope = (facilityId: string) => scopedFacilityIds.includes(facilityId);

  const canAny = (caps: Capability[]) => caps.some((c) => can(role, c));

  const counts: Record<string, number> = {};
  if (canAny(["UC-IAL-01", "UC-IAL-02"])) counts.users = store.users.length;
  if (can(role, "UC-ASS-04")) counts.activeSessions = store.sessions.filter((s) => s.active).length;
  if (canAny(["UC-FMG-01", "UC-FMG-02", "UC-FMG-03", "UC-FMG-04", "UC-FMG-05"])) {
    counts.facilities = scopedFacilityIds.length > 0 && role === "Facility Administrator"
      ? scopedFacilityIds.length
      : store.facilities.length;
  }
  if (canAny(["UC-AGA-03", "UC-AGA-04"])) {
    counts.pendingOnboarding = store.onboardingRequests.filter(
      (r) => r.status === "Pending" && (role !== "Facility Administrator" || inScope(r.facilityId))
    ).length;
  }
  if (canAny(["UC-AGA-05", "UC-AGA-06"])) {
    counts.pendingAccess = store.accessChangeRequests.filter(
      (r) => r.status === "Pending" && (role !== "Facility Administrator" || inScope(r.facilityId))
    ).length;
  }
  if (canAny(["UC-FMG-04", "UC-FMG-05"])) {
    counts.pendingModules = store.moduleChangeRequests.filter(
      (r) => r.status === "Pending" && (role !== "Facility Administrator" || inScope(r.facilityId))
    ).length;
  }
  if (canAny(["UC-OSO-01", "UC-OSO-02"])) counts.audit = store.audit.length;
  if (can(role, "UC-AGA-07")) {
    counts.authorizations = store.audit.filter((e) => e.action === "AUTHORIZE_SERVICE_ACCESS").length;
  }

  return NextResponse.json({
    actor: gate.actor,
    capabilities: capabilitiesFor(role),
    scopedFacilityIds,
    counts
  });
}
