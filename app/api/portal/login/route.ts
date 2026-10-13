// Administration-portal sign-in gate.
// Only WAH Central Administrator, Facility Administrator and Participating WAH
// Service may enter. WAH Service User accounts are refused (V9 portal scope).
// Credentials + usernames are read from the local SQLite store
// (lib/credentials.ts → scripts/sqlite-init.mjs); nothing is hard-coded here.
import { NextResponse } from "next/server";
import { isPortalRole, PORTAL_ACCESS_ROLES, type PortalActorRole } from "@/lib/access";
import { portalAccount, verifyCredential } from "@/lib/credentials";
import { audit, notify } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email, password } = body as { email?: string; password?: string };
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const valid = await verifyCredential(email, password);
  if (!valid) {
    // Repeated failed attempts raise/escalate a single oversight alert.
    notify(
      "FAILED_LOGIN",
      email,
      `Failed sign-in attempt for ${email} (invalid credentials).`,
      "warning"
    );
    audit(email, "unknown", "SIGN_IN_FAILED", "portal-session", "failure", undefined, "UC-IAL-03: invalid credentials.");
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const account = portalAccount(email);
  if (!account) {
    return NextResponse.json(
      { error: "Account exists but is not registered as a WAHrden portal user." },
      { status: 403 }
    );
  }
  if (account.status !== "Active") {
    return NextResponse.json(
      { error: `Account not eligible: life-cycle status is ${account.status}.` },
      { status: 403 }
    );
  }
  const role = account.portal_role as PortalActorRole;
  if (!isPortalRole(role) || !PORTAL_ACCESS_ROLES.includes(role)) {
    notify(
      "UNAUTHORIZED_ACCESS",
      account.email,
      `WAH Service User or non-portal account (${account.email}) attempted administration-portal sign-in.`,
      "critical"
    );
    return NextResponse.json(
      {
        error:
          "Access denied: WAH Service User accounts are not permitted to use the WAHrden administration portal."
      },
      { status: 403 }
    );
  }

  audit(account.email, role, "SIGN_IN", "portal-session", "success", account.id, "UC-IAL-03: portal sign-in.");

  return NextResponse.json({
    session: {
      userId: account.id,
      role,
      displayName: account.display_name,
      email: account.email
    }
  });
}