import { NextResponse } from "next/server";
import { audit, db } from "@/lib/db";
import { authorize } from "@/lib/server-access";

export async function GET(req: Request) {
  const gate = authorize(req, "UC-ASS-04");
  if (!gate.ok) return gate.res;
  return NextResponse.json({ sessions: db().sessions });
}

export async function DELETE(req: Request) {
  const gate = authorize(req, "UC-ASS-04");
  if (!gate.ok) return gate.res;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const store = db();
  const s = store.sessions.find((x) => x.id === id);
  if (!s) return NextResponse.json({ error: "Active session unavailable (EF-02)." }, { status: 404 });
  if (!s.active) return NextResponse.json({ error: "Session is no longer active (EF-02).", session: s }, { status: 409 });
  s.active = false;
  audit(gate.actor.email, gate.actor.role, "TERMINATE_ACTIVE_SESSION", "session", "success", s.id, "UC-ASS-04: session deliberately terminated.");
  return NextResponse.json({ session: s });
}
