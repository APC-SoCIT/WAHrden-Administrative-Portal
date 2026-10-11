// Read-only, facility-scoped user list for a Facility Administrator.
// Needed to identify the target user of an access-change request (UC-AGA-05)
// without granting any account-management capability (UC-IAL-01/02).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/server-access";

export async function GET(req: Request) {
  const gate = authorize(req, "UC-AGA-05");
  if (!gate.ok) return gate.res;
  const store = db();
  const scopedFacilityIds = store.access
    .filter((a) => a.userId === gate.actor.id)
    .map((a) => a.facilityId);
  const userIds = new Set(
    store.access.filter((a) => scopedFacilityIds.includes(a.facilityId)).map((a) => a.userId)
  );
  const users = store.users
    .filter((u) => userIds.has(u.id))
    .map((u) => ({ id: u.id, displayName: u.displayName, email: u.email, status: u.status }));
  return NextResponse.json({ users });
}
