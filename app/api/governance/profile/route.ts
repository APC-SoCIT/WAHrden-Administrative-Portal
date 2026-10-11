// UC-IAL-03 — Update Own Profile. Only permitted self-maintenance fields;
// centrally governed account/credential/role/facility data is rejected (EF-04).
import { NextResponse } from "next/server";
import { audit, db } from "@/lib/db";
import { authorize } from "@/lib/server-access";

const PROTECTED = ["status", "roles", "permissions", "facilityAccess", "modules", "credential"];

export async function GET(req: Request) {
  const gate = authorize(req, "UC-IAL-03");
  if (!gate.ok) return gate.res;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? gate.actor.id;
  if (userId !== gate.actor.id) {
    return NextResponse.json({ error: "A profile may only be maintained for the acting identity (EF-04)." }, { status: 403 });
  }
  const store = db();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return NextResponse.json({ error: "Identity or profile unavailable (EF-01)." }, { status: 404 });
  return NextResponse.json({ profile: user.profile });
}

export async function PATCH(req: Request) {
  const gate = authorize(req, "UC-IAL-03");
  if (!gate.ok) return gate.res;
  const body = await req.json().catch(() => ({}));
  const { userId, changes } = body as { userId?: string; changes?: Record<string, string> };
  if (userId && userId !== gate.actor.id) {
    return NextResponse.json({ error: "A profile may only be maintained for the acting identity (EF-04)." }, { status: 403 });
  }
  const store = db();
  const user = store.users.find((u) => u.id === gate.actor.id);
  if (!user) return NextResponse.json({ error: "Identity or profile unavailable (EF-01)." }, { status: 404 });
  const keys = Object.keys(changes ?? {});
  const prohibited = keys.filter(
    (k) => PROTECTED.includes(k) || !["fullName", "contactEmail", "contactPhone"].includes(k)
  );
  if (prohibited.length > 0) {
    return NextResponse.json(
      { error: `Prohibited profile change: [${prohibited.join(", ")}] cannot be modified via own-profile maintenance (EF-04).` },
      { status: 403 }
    );
  }
  if (!changes?.fullName || !changes?.contactEmail || !changes.contactEmail.includes("@")) {
    return NextResponse.json(
      { error: "Invalid or incomplete profile changes: fullName and a valid contactEmail are required (EF-03)." },
      { status: 400 }
    );
  }
  user.profile = {
    fullName: changes.fullName,
    contactEmail: changes.contactEmail,
    contactPhone: changes.contactPhone ?? ""
  };
  audit(gate.actor.email, gate.actor.role, "UPDATE_OWN_PROFILE", "profile", "success", user.id, "UC-IAL-03: permitted profile fields updated.");
  return NextResponse.json({ profile: user.profile });
}
