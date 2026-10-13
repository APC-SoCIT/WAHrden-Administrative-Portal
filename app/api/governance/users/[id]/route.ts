// UC-IAL-02 — Change User Account Status.
// Two-state manual control only: Active <-> Deactivate (system-managed
// "Inactive"). There is no manual Inactive/Retired option. Deactivating an
// account also terminates its active sessions (Module 2 alignment).
import { NextResponse } from "next/server";
import { audit, db } from "@/lib/db";
import { authorize } from "@/lib/server-access";
import type { AccountStatus } from "@/lib/types";

const ALLOWED: Record<AccountStatus, AccountStatus[]> = {
  Active: ["Inactive"],
  Inactive: ["Active"]
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
  if (!status || !["Active", "Inactive"].includes(status)) {
    return NextResponse.json(
      { error: "Only 'Active' or 'Inactive' (Deactivate) are valid status values." },
      { status: 400 }
    );
  }
  if (status === user.status || !ALLOWED[user.status].includes(status)) {
    return NextResponse.json(
      { error: `Invalid lifecycle transition ${user.status} → ${status} (EF-03).` },
      { status: 422 }
    );
  }
  user.status = status;
  let terminated = 0;
  if (status === "Inactive") {
    store.sessions.forEach((s) => {
      if (s.userId === user.id && s.active) {
        s.active = false;
        s.endedAt = new Date().toISOString();
        terminated += 1;
      }
    });
  }
  audit(
    gate.actor.email,
    gate.actor.role,
    "CHANGE_USER_ACCOUNT_STATUS",
    "user",
    "success",
    user.id,
    status === "Inactive"
      ? `UC-IAL-02: ${user.email} deactivated; ${terminated} active session(s) terminated (Module 2).`
      : `UC-IAL-02: ${user.email} reactivated.`
  );
  return NextResponse.json({ user, terminatedSessions: terminated });
}