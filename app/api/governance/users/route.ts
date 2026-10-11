// UC-IAL-01 (create) + UC-IAL-02 (list/search for status admin).
// Creation validates completeness + duplicate/conflict (EF-02/EF-03) and
// never auto-assigns facility access (V9 separation rule).
import { NextResponse } from "next/server";
import { audit, db, nid } from "@/lib/db";
import { authorize } from "@/lib/server-access";

export async function GET(req: Request) {
  const gate = authorize(req, ["UC-IAL-01", "UC-IAL-02"]);
  if (!gate.ok) return gate.res;
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").toLowerCase();
  const store = db();
  const users = q
    ? store.users.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      )
    : store.users;
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const gate = authorize(req, "UC-IAL-01");
  if (!gate.ok) return gate.res;
  const body = await req.json().catch(() => ({}));
  const { displayName, email, phone } = body as {
    displayName?: string;
    email?: string;
    phone?: string;
  };
  const store = db();
  // EF-02: invalid / incomplete account information
  if (!displayName || !email || !email.includes("@")) {
    return NextResponse.json(
      {
        error:
          "Invalid or incomplete account information: displayName and a valid email are required (EF-02)."
      },
      { status: 400 }
    );
  }
  // EF-03: duplicate or conflicting centralized identity
  const clash = store.users.find(
    (u) => u.email.toLowerCase() === String(email).toLowerCase()
  );
  if (clash) {
    return NextResponse.json(
      {
        error: `Duplicate or conflicting centralized identity: ${clash.email} already exists (EF-03).`,
        conflictingUser: clash
      },
      { status: 409 }
    );
  }
  const now = new Date().toISOString();
  const user = {
    id: nid("u"),
    displayName,
    email,
    phone,
    status: "Active" as const,
    portalRole: "WAH Service User" as const,
    createdAt: now,
    profile: { fullName: displayName, contactEmail: email, contactPhone: phone ?? "" },
    hasCredential: true,
    recoveryEnrolled: false
  };
  store.users.push(user);
  audit(gate.actor.email, gate.actor.role, "CREATE_USER_ACCOUNT", "user", "success", user.id, `UC-IAL-01: created ${email}. No facility access assigned.`);
  return NextResponse.json({ user }, { status: 201 });
}
