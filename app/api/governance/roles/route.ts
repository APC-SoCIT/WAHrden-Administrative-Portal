// UC-AGA-01 Configure Roles and Permissions + UC-AGA-02 Assign User Access.
import { NextResponse } from "next/server";
import { audit, db, nid } from "@/lib/db";
import { authorize } from "@/lib/server-access";

export async function GET(req: Request) {
  const gate = authorize(req, ["UC-AGA-01", "UC-AGA-02", "UC-AGA-03", "UC-AGA-04", "UC-AGA-05", "UC-AGA-06"]);
  if (!gate.ok) return gate.res;
  const store = db();
  return NextResponse.json({ roles: store.roles });
}

export async function POST(req: Request) {
  const gate = authorize(req, "UC-AGA-01");
  if (!gate.ok) return gate.res;
  const body = await req.json().catch(() => ({}));
  const { name, description, permissions } = body as {
    name?: string;
    description?: string;
    permissions?: string[];
  };
  if (!name || !Array.isArray(permissions) || permissions.length === 0) {
    return NextResponse.json(
      { error: "Invalid role or permission configuration: name + at least one permission required (EF-03)." },
      { status: 400 }
    );
  }
  const store = db();
  if (store.roles.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: "Role configuration unavailable: a role with this name exists." }, { status: 409 });
  }
  const role = { id: nid("r"), name, description: description ?? "", permissions };
  store.roles.push(role);
  audit(gate.actor.email, gate.actor.role, "CONFIGURE_ROLE", "role", "success", role.id, `UC-AGA-01: role '${name}' created.`);
  return NextResponse.json({ role }, { status: 201 });
}
