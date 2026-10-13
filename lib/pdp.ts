// Policy Decision Engine (PDP) — UC-AGA-07 main flow steps 2.1 → 2.4.
// Mirrors the Component Diagram pipeline:
//   Facility Scope Evaluator (2.1) → Role & Permission Evaluator (2.2/2.3)
//   → Facility Module Validator (2.4) → Authorized/Denied + audit record.
// Fail-closed: any insufficient context returns Denied (never Authorized).
import type { AuthzDecision, AuthzRequest } from "./types";
import type { Seed } from "./seed";

export function evaluateAuthz(store: Seed, req: AuthzRequest): AuthzDecision {
  const evaluations: AuthzDecision["evaluations"] = [];

  // EF-01: invalid / incomplete request → Denied
  if (!req.userId || !req.facilityId || !req.action) {
    return {
      decision: "Denied",
      audited: false,
      evaluations: [
        {
          step: "1.1 request/context validation",
          ok: false,
          detail:
            "Invalid or incomplete authorization request: userId, facilityId and action are required."
        }
      ]
    };
  }

  const user = store.users.find((u) => u.id === req.userId);
  // EF-02: identity/context cannot be established → Denied
  if (!user) {
    evaluations.push({
      step: "2.1 identity/facility evaluation",
      ok: false,
      detail: `Centralized identity '${req.userId}' cannot be established.`
    });
    return { decision: "Denied", audited: false, evaluations };
  }
  const facility = store.facilities.find((f) => f.id === req.facilityId);
  if (!facility) {
    evaluations.push({
      step: "2.1 identity/facility evaluation",
      ok: false,
      detail: `Healthcare facility '${req.facilityId}' cannot be established.`
    });
    return { decision: "Denied", audited: false, evaluations };
  }
  evaluations.push({
    step: "2.1 identity/facility evaluation",
    ok: true,
    detail: `${user.displayName} @ ${facility.name} resolved.`
  });

  // Account eligibility gates authentication-derived authorization:
  // Deactivated (Inactive) accounts cannot be Authorized (UC-IAL-02 + UC-ASS-03 EF-03).
  if (user.status !== "Active") {
    evaluations.push({
      step: "2.1b account eligibility",
      ok: false,
      detail: `Account lifecycle status is '${user.status}'; only Active accounts can be authorized.`
    });
    return { decision: "Denied", audited: false, evaluations };
  }
  evaluations.push({
    step: "2.1b account eligibility",
    ok: true,
    detail: "Account is Active."
  });

  // 2.2 facility-specific access assignment (UC-AGA-02 state)
  const assignments = store.access.filter(
    (a) => a.userId === user.id && a.facilityId === facility.id
  );
  if (assignments.length === 0) {
    evaluations.push({
      step: "2.2 facility-specific access assignment",
      ok: false,
      detail: "No facility-scoped access assignment covers this user@facility."
    });
    return { decision: "Denied", audited: false, evaluations };
  }
  evaluations.push({
    step: "2.2 facility-specific access assignment",
    ok: true,
    detail: `${assignments.length} assignment(s) found for user@facility.`
  });

  // 2.3 role/permission requirements (UC-AGA-01 model)
  const permissionSet = new Set<string>();
  for (const a of assignments) {
    const role = store.roles.find((r) => r.id === a.roleId);
    if (!role) continue;
    role.permissions.forEach((p) => permissionSet.add(p));
  }
  const permissionList = Array.from(permissionSet);
  const permissioned =
    permissionSet.has("*") || permissionSet.has(req.action);
  evaluations.push({
    step: "2.3 role/permission evaluation",
    ok: permissioned,
    detail: permissioned
      ? `Action '${req.action}' is granted by role permissions [${permissionList.join(", ")}].`
      : `Action '${req.action}' is NOT in granted permissions [${permissionList.join(", ") || "none"}].`
  });
  if (!permissioned) return { decision: "Denied", audited: false, evaluations };

  // 2.4 facility module availability (UC-FMG-03 state) — only when relevant.
  if (req.moduleId) {
    const fm = store.facilityModules.find(
      (m) => m.facilityId === facility.id && m.moduleId === req.moduleId
    );
    const mod = store.modules.find((m) => m.id === req.moduleId);
    const enabled = !!fm?.enabled;
    evaluations.push({
      step: "2.4 facility module availability",
      ok: enabled,
      detail: enabled
        ? `Module '${mod?.code ?? req.moduleId}' is enabled for ${facility.name}.`
        : `Module '${mod?.code ?? req.moduleId}' is NOT enabled for ${facility.name}.`
    });
    if (!enabled) return { decision: "Denied", audited: false, evaluations };
  } else {
    evaluations.push({
      step: "2.4 facility module availability",
      ok: true,
      detail: "No module scoping supplied; module check not applicable."
    });
  }

  // 3.0 Authorized
  evaluations.push({
    step: "3.0 authorization decision",
    ok: true,
    detail: "All applicable authorization constraints satisfied."
  });
  return { decision: "Authorized", audited: false, evaluations };
}
