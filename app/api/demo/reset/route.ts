import { NextResponse } from "next/server";
import { resetDb } from "@/lib/db";
import { requirePortal } from "@/lib/server-access";

export async function POST(req: Request) {
  const gate = requirePortal(req);
  if (!gate.ok) return gate.res;
  const store = resetDb();
  return NextResponse.json({ ok: true, counts: { users: store.users.length, facilities: store.facilities.length } });
}
