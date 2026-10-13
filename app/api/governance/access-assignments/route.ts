// UC-AGA-02 — Assign User Access (establish / modify / revoke facility-scoped access).
import { NextResponse } from "next/server";
import { audit, db, nid } from "@/lib/db";
import { authorize } from "@/lib/server-access";

export async function GET(req: Request) {
  // Access assignments are a central-administration concern in V9.
  const gate = authorize(req, ["UC-AGA-01", "UC-AGA-02"]);
  if (!gate.ok) return gate.res;
  const store = db();
  return NextResponse.json({ assignments: store.access });
}

export async function POST(req: Request) {
  const gate = authorize(req, "UC-AGA-02");
  if (!gate.ok) return gate.res;
  const body = await req.json().catch(() => ({}));
  const { userId, userIds, facilityId, roleId } = body as {
    userId?: string; userIds?: string[]; facilityId?: string; roleId?: string;
  };
  const store = db();
  const facility = store.facilities.find((f) => f.id === facilityId);
  const role = store.roles.find((r) => r.id === roleId);
  if (!facility) {
    return NextResponse.json({ error: "Facility context unavailable (EF-02)." }, { status: 404 });
  }
  if (!role) return NextResponse.json({ error: "Invalid or out-of-scope access change: unknown role (EF-03)." }, { status: 400 });

  // Bulk assignment (onboard several users into the same facility at once).
  const targets = Array.isArray(userIds) && userIds.length ? userIds : userId ? [userId] : [];
  if (targets.length === 0) {
    return NextResponse.json({ error: "Select at least one user (EF-02)." }, { status: 400 });
  }

  const results: { userId: string; mode: string; assignment?: unknown }[] = [];
  const errors: { userId: string; error: string }[] = [];
  for (const uid of targets) {
    const user = store.users.find((u) => u.id === uid);
    if (!user) { errors.push({ userId: uid, error: "user not found" }); continue; }
    const existing = store.access.find((a) => a.userId === uid && a.facilityId === facilityId);
    if (existing) {
      existing.roleId = roleId!;
      audit(gate.actor.email, gate.actor.role, "MODIFY_USER_ACCESS", "access", "success", existing.id, `UC-AGA-02 AF-02: ${user.email}@${facility.code} → ${role.name}.`);
      results.push({ userId: uid, mode: "modified", assignment: existing });
    } else {
      const assignment = { id: nid("a"), userId: uid, facilityId: facilityId!, roleId: roleId!, createdAt: new Date().toISOString() };
      store.access.push(assignment);
      audit(gate.actor.email, gate.actor.role, "ASSIGN_USER_ACCESS", "access", "success", assignment.id, `UC-AGA-02 AF-01: ${user.email}@${facility.code} → ${role.name}.`);
      results.push({ userId: uid, mode: "established", assignment });
    }
  }

  if (targets.length > 1) {
    return NextResponse.json({
      bulk: true,
      applied: results.length,
      failed: errors,
      results,
      mode: `${results.length} user(s) ${results.every((r) => r.mode === "modified") ? "modified" : "established/modified"}`
    });
  }
  const single = results[0];
  if (!single) {
    return NextResponse.json({ error: errors[0]?.error ?? "User unavailable (EF-02)." }, { status: 404 });
  }
  return NextResponse.json(
    { assignment: single.assignment, mode: single.mode },
    { status: single.mode === "established" ? 201 : 200 }
  );
}

export async function DELETE(req: Request) {
  const gate = authorize(req, "UC-AGA-02");
  if (!gate.ok) return gate.res;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const store = db();
  const idx = store.access.findIndex((a) => a.id === id);
  if (idx < 0) return NextResponse.json({ error: "Access assignment unavailable." }, { status: 404 });
  const [removed] = store.access.splice(idx, 1);
  audit(gate.actor.email, gate.actor.role, "REVOKE_USER_ACCESS", "access", "success", removed.id, "UC-AGA-02 AF-03: facility-specific access revoked.");
  return NextResponse.json({ revoked: removed });
}
