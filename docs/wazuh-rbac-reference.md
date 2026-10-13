# Wazuh RBAC as a reference for WAHrden role & permission management

Status: **design reference / future work** (not implemented in the prototype).
Purpose: capture how the Wazuh Dashboard models roles, permissions and
resource scoping so the WAHrden administration portal can evolve UC-AGA-01
(role configuration) and UC-AGA-02 (facility-scoped assignment) toward a more
expressive, policy-driven authorization model.

> This is an original summarised description of Wazuh's publicly documented
> RBAC concepts. No Wazuh source code or proprietary assets are reproduced.

## Why Wazuh is a useful reference

WAHrden currently uses a simple RBAC model:

- a flat `Role` with a list of string `permissions` (e.g. `consultation.read`),
- a `*` wildcard for the Central Administrator,
- facility scoping expressed as a separate `AccessAssignment` row.

Wazuh's RBAC generalises this into **(subject, role, policy, resource)** with
explicit mapping between them, which is a good target once roles grow and
per-facility / per-module scoping becomes finer-grained.

## Wazuh RBAC building blocks

| Concept | Wazuh | WAHrden analogue today | Gap / opportunity |
| --- | --- | --- | --- |
| Subject | User or rule | Portal actor (`User`) | Similar |
| Role | Named collection of policies | `Role.permissions` | Wazuh binds *policies*, not raw permission strings |
| Policy | Actions + effect (allow/deny) + resources | none | Add a `Policy` layer |
| Action | e.g. `agent:read`, `*:*` | permission string | Namespace + verb syntax |
| Resource | `*` or a pattern (e.g. `agent:group`) | `facilityId` | Generalise scope to any resource pattern |
| Mapping | role ↔ policy ↔ subject | `AccessAssignment` | Facility scope could be a resource on the mapping |

Key Wazuh ideas worth adopting:

1. **Actions have structure** — `resource:verb` (e.g. `agent:read`) and the
   wildcard `*:*`. WAHrden's `consultation.read` already follows this shape;
   formalise it as `namespace.verb` and support wildcards per namespace.
2. **Policies are reusable** — a policy bundles actions + resources + effect,
   and many roles reuse the same policy. This avoids duplicating permission
   lists across roles.
3. **Resources are patterns** — a policy applies to `*` or to a scoped pattern.
   This is where WAHrden's facility scoping can be modelled cleanly
   (a policy scoped to a facility resource instead of a separate join table).
4. **Deny beats allow** — an explicit deny overrides any allow. This is a safer
   default and worth mirroring in WAHrden's PDP.
5. **Separation of duties** — Wazuh ships reserved roles (e.g. an administrator
   cannot be deleted / downgraded without a safeguard). WAHrden's V9 rules
   (Central Administrator cannot self-modify in ways that break governance,
   onboarding never auto-creates accounts) follow the same spirit.

## Suggested evolution path for WAHrden

1. Introduce a `Policy` entity: `{ id, name, effect: "allow" | "deny",
   actions: string[], resources: string[] }`.
2. Change `Role` to reference policy ids instead of raw permissions.
3. Resolve a decision as: collect policies for (actor, role, resource), apply
   **deny-overrides-allow**, then check the action.
4. Express facility scope as a resource pattern on the policy/mapping, so
   UC-AGA-02 becomes "map subject → role → resource-within-facility".
5. Keep the current `lib/pdp.ts` as the single decision point — extend it to
   evaluate policies rather than a flat permission list.

## Mapping to current WAHrden source

- `lib/access.ts` — portal roles, capabilities, `GRANTS`, navigation.
- `lib/permissions.ts` — the flat permission catalogue surfaced as checkboxes
  in UC-AGA-01 (`PERMISSION_CATALOG`).
- `lib/pdp.ts` — the policy decision point (status + capability + facility
  scope checks).
- `lib/types.ts` — `Role`, `AccessAssignment`, `FunctionalModule`.

Adopting policies would primarily change `Role`, `lib/access.ts` and
`lib/pdp.ts`, leaving the use-case routes untouched.

## References

- Wazuh documentation — "Role-Based Access Control" (RBAC) section.
- Wazuh documentation — "Policies" and "Mapping users/roles to policies".
