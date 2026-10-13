// Module 5 (UC-OSO-01) — suspicious/repeated-activity alerts.
// Surfaced to the WAH Central Administrator (and read-only to oversight views).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/server-access";

export async function GET(req: Request) {
  const gate = authorize(req, ["UC-OSO-01", "UC-OSO-02"]);
  if (!gate.ok) return gate.res;
  const alerts = [...db().notifications].sort((a, b) => b.at.localeCompare(a.at));
  return NextResponse.json({
    notifications: alerts,
    unread: alerts.length
  });
}
