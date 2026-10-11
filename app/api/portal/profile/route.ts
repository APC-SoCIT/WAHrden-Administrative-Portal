// UC-IAL-03 — Update Own Profile (participating WAH service self-service).
import { NextResponse } from "next/server";
import { audit, db } from "@/lib/db";
import { authorize } from "@/lib/server-access";

export async function GET(req: Request) {
  const gate = authorize(req, "UC-IAL-03");
  if (!gate.ok) return gate.res;
  const store = db();
  const user = store.users.find((u) => u.id === gate.actor.id);
  return NextResponse.json({ user: user && { id: user.id, displayName: user.displayName, email: user.email, profile: user.profile } });
}

export async function PATCH(req: Request) {
  const gate = authorize(req, "UC-IAL-03");
  if (!gate.ok) return gate.res;
  const body = await req.json().catch(() => ({}));
  const { fullName, contactEmail, contactPhone } = body as {
    fullName?: string; contactEmail?: string; contactPhone?: string;
  };
  const store = db();
  const user = store.users.find((u) => u.id === gate.actor.id);
  if (!user) return NextResponse.json({ error: "Account not found (EF-02)." }, { status: 404 });
  if (!user.profile) user.profile = { fullName: user.displayName, contactEmail: user.email, contactPhone: "" };
  if (typeof fullName === "string" && fullName.trim()) user.profile.fullName = fullName.trim();
  if (typeof contactEmail === "string" && contactEmail.trim()) user.profile.contactEmail = contactEmail.trim();
  if (typeof contactPhone === "string") user.profile.contactPhone = contactPhone.trim();
  audit(gate.actor.email, gate.actor.role, "UPDATE_OWN_PROFILE", "user", "success", user.id, "UC-IAL-03: participating service updated its own profile.");
  return NextResponse.json({ user });
}