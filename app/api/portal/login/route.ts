// Administration-portal sign-in gate.
// Only WAH Central Administrator, Facility Administrator and Participating WAH
// Service may enter. WAH Service User accounts are refused (V9 portal scope).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCredential } from "@/lib/credentials";
import { isPortalRole, PORTAL_ACCESS_ROLES } from "@/lib/access";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email, password } = body as { email?: string; password?: string };
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  const store = db();
  const user = store.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  const valid = await verifyCredential(email, password);
  if (!user || !valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  if (user.status !== "Active") {
    return NextResponse.json(
      { error: `Account not eligible: life-cycle status is ${user.status}.` },
      { status: 403 }
    );
  }
  if (!isPortalRole(user.portalRole) || !PORTAL_ACCESS_ROLES.includes(user.portalRole)) {
    return NextResponse.json(
      {
        error:
          "Access denied: WAH Service User accounts are not permitted to use the WAHrden administration portal."
      },
      { status: 403 }
    );
  }
  return NextResponse.json({
    session: {
      userId: user.id,
      role: user.portalRole,
      displayName: user.displayName,
      email: user.email
    }
  });
}
