// UC-IAL-02 — Change User Account Status (Active/Inactive/Retired).
// Retired retains identity for audit; Inactive/Retired invalidates sessions.
import { NextResponse } from "next/server";
import { audit, db } from "@/lib/db";
import { authorize } from "@/lib/server-access";
import type { AccountStatus } from "@/lib/types";

const ALLOWED: Record<AccountStatus, AccountStatus[]> = {
  Active: ["Inactive", "Retired"],
  Inactive: ["Active", "Retired"],
  Retired: ["Active"]
};

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const gate = authorize(req, "UC-IAL-02");
  if (!gate.ok) return gate.res;
  const body = await req.json().catch(() => ({}));
  const { status } = body as { status?: AccountStatus };
  const store = db();
  const user = store.users.find((u) => u.id === params.id);
  if (!user) return NextResponse.json({ error: "Account not found (EF-02)." }, { status: 404 });
  if (!status || !["Active", "Inactive", "Retired"].includes(status)) {
    return NextResponse.json({ error: "A valid target lifecycle status is required." }, { status: 400 });
  }
  if (status === user.status || !ALLOWED[user.status].includes(status)) {
    return NextResponse.json(
      { error: `Invalid lifecycle transition ${user.status} → ${status} (EF-03).` },
      { status: 422 }
    );
  }
  user.status = status;
  if (status === "Inactive" || status === "Retired") {
    store.sessions.forEach((s) => {
      if (s.userId === user.id) s.active = false;
    });
  }
  audit(gate.actor.email, gate.actor.role, "CHANGE_USER_ACCOUNT_STATUS", "user", "success", user.id, `UC-IAL-02: ${user.email} → ${status}.`);
  return NextResponse.json({ user });
}
