import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    service: "wahrden-iam-prototype",
    status: "ok",
    time: new Date().toISOString(),
    contracts: {
      authz: "POST /api/v1/authz/evaluate",
      docs: "GET /architecture"
    }
  });
}
