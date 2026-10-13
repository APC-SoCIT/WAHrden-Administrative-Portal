// WAHrden domain model — mirrors Fully-Dressed Use Cases V9 + C4/component diagrams.
// Prototype note: production maps these to PostgreSQL (Core DB + Audit Store)
// and Redis (Session & Cache Store). Here they are served from an in-memory
// store via Next.js Route Handlers so the prototype is stateless/Vercel-ready.

import type { PortalActorRole } from "./access";

// Manual account status is a two-state control (UC-IAL-02): an account is
// either Active or Deactivated. "Inactive" is the system-managed result of a
// deactivation (and is set automatically), so the admin only sees Active /
// Deactivate — there is no manual Inactive or Retired option.
export type AccountStatus = "Active" | "Inactive";
export type ActorRole = PortalActorRole;

export interface User {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  status: AccountStatus;
  // Portal actor type. Drives administration-portal access + per-actor content.
  portalRole: PortalActorRole;
  createdAt: string;
  // Permitted self-maintained profile fields (UC-IAL-03). Centrally governed
  // fields (status, roles, facility access) are NOT editable via this path.
  profile: { fullName: string; contactEmail: string; contactPhone: string };
  hasCredential: boolean;
  recoveryEnrolled: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // e.g. "consultation.read"
}

export interface Facility {
  id: string;
  code: string;
  name: string;
  type: string;
  region: string;
  status: "Registered" | "Suspended";
  updatedAt: string;
}

export interface AccessAssignment {
  id: string;
  userId: string;
  facilityId: string;
  roleId: string;
  createdAt: string;
}

export interface FunctionalModule {
  id: string;
  code: string;
  name: string;
}

export interface FacilityModule {
  facilityId: string;
  moduleId: string;
  enabled: boolean;
}

export type RequestStatus = "Pending" | "Approved" | "ApprovedModified" | "Rejected";

export interface OnboardingRequest {
  id: string;
  facilityId: string;
  requestedBy: string; // facility admin user id
  prospectiveName: string;
  prospectiveEmail: string;
  requestedRoleId: string;
  // Functional modules access is being requested for, alongside the role.
  requestedModuleIds?: string[];
  reason?: string;
  status: RequestStatus;
  decisionBy?: string;
  decidedAt?: string;
  // Reviewer's comment — the visible reason for an approval, modification or
  // rejection (required for Reject / Modify-and-Approve).
  reviewComment?: string;
  createdAt: string;
}

export interface AccessChangeRequest {
  id: string;
  facilityId: string;
  targetUserId: string;
  requestedBy: string;
  changeKind: "GRANT" | "MODIFY" | "REVOKE";
  roleId?: string;
  reason?: string;
  status: RequestStatus;
  decisionBy?: string;
  decidedAt?: string;
  createdAt: string;
}

export interface ModuleChangeRequest {
  id: string;
  facilityId: string;
  moduleId: string;
  requestedBy: string;
  desiredEnabled: boolean;
  reason?: string;
  status: RequestStatus;
  decisionBy?: string;
  decidedAt?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  service: "WAH4PC" | "WAH4Hospital" | "OpenHIM";
  startedAt: string;
  endedAt?: string;
  active: boolean;
  // Device / client context captured at authentication time.
  device: string; // e.g. "Chrome 126 · macOS"
  location: string; // e.g. "Manila, PH"
  ip: string; // e.g. "203.0.113.24"
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  actorRole: ActorRole | string;
  action: string;
  entity: string;
  entityId?: string;
  result: string;
  detail?: string;
}

export type NotificationType = "FAILED_LOGIN" | "UNAUTHORIZED_ACCESS" | "SUSPICIOUS_ACTIVITY";

// Module 5 (UC-OSO-01) — surfaced alerts for repeated/suspicious activity.
export interface Notification {
  id: string;
  at: string;
  type: NotificationType;
  severity: "warning" | "critical";
  subject: string; // email / actor the alert concerns
  detail: string;
  count: number; // occurrences collapsed into this alert
}

// UC-AGA-07 authorization contract (POST /api/v1/authz/evaluate).
export interface AuthzRequest {
  userId: string;
  facilityId: string;
  action: string; // e.g. "consultation.read" (permission) or function/action id
  moduleId?: string; // functional module code required for the action, if relevant
  service?: string; // participating service on whose behalf the check runs
}

export interface AuthzEvaluationStep {
  step: string;
  ok: boolean;
  detail: string;
}

export interface AuthzDecision {
  decision: "Authorized" | "Denied";
  evaluations: AuthzEvaluationStep[];
  audited: boolean;
}
