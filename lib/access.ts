// WAHrden Administration Portal — access model.
// Sourced strictly from the V9 use-case diagrams (WAHrden_UCD_V9 / V9.2):
// the portal is exposed to WAH Central Administrator, Facility Administrator and
// Participating WAH Service only. WAH Service User is intentionally excluded.
//
// Capability = a use case (UC-xxx-nn). A role is granted a set of capabilities;
// page/navigation guards and server-side route checks are both derived from here.

export type PortalActorRole =
  | "WAH Central Administrator"
  | "Facility Administrator"
  | "Participating WAH Service"
  | "WAH Service User";

export type Capability =
  | "UC-IAL-01"
  | "UC-IAL-02"
  | "UC-IAL-03"
  | "UC-ASS-04"
  | "UC-AGA-01"
  | "UC-AGA-02"
  | "UC-AGA-03"
  | "UC-AGA-04"
  | "UC-AGA-05"
  | "UC-AGA-06"
  | "UC-AGA-07"
  | "UC-FMG-01"
  | "UC-FMG-02"
  | "UC-FMG-03"
  | "UC-FMG-04"
  | "UC-FMG-05"
  | "UC-OSO-01"
  | "UC-OSO-02";

// Roles permitted to sign in to the administration portal.
export const PORTAL_ACCESS_ROLES: PortalActorRole[] = [
  "WAH Central Administrator",
  "Facility Administrator",
  "Participating WAH Service"
];

export function isPortalRole(role: string): role is PortalActorRole {
  return (
    role === "WAH Central Administrator" ||
    role === "Facility Administrator" ||
    role === "Participating WAH Service" ||
    role === "WAH Service User"
  );
}

// Capabilities granted to each actor, exactly as drawn in the V9 UCDs.
const GRANTS: Record<PortalActorRole, Capability[]> = {
  "WAH Central Administrator": [
    "UC-IAL-01",
    "UC-IAL-02",
    "UC-ASS-04",
    "UC-AGA-01",
    "UC-AGA-02",
    "UC-AGA-04",
    "UC-AGA-06",
    "UC-FMG-01",
    "UC-FMG-02",
    "UC-FMG-03",
    "UC-FMG-05",
    "UC-OSO-01",
    "UC-OSO-02"
  ],
  "Facility Administrator": ["UC-AGA-03", "UC-AGA-05", "UC-FMG-04"],
  "Participating WAH Service": ["UC-AGA-07", "UC-IAL-03"],
  "WAH Service User": []
};

export function capabilitiesFor(role: PortalActorRole): Capability[] {
  return GRANTS[role] ?? [];
}

export function can(role: PortalActorRole, capability: Capability): boolean {
  return capabilitiesFor(role).includes(capability);
}

export function canAny(role: PortalActorRole, capabilities: Capability[]): boolean {
  return capabilities.some((c) => can(role, c));
}

export interface UseCaseMeta {
  id: Capability;
  module: string;
  moduleCode: string;
  submodule?: string;
  title: string;
}

export const USE_CASES: UseCaseMeta[] = [
  { id: "UC-IAL-01", module: "1", moduleCode: "IAL", title: "Create User Account" },
  { id: "UC-IAL-02", module: "1", moduleCode: "IAL", title: "Change User Account Status" },
  { id: "UC-IAL-03", module: "1", moduleCode: "IAL", title: "Update Own Profile" },
  { id: "UC-ASS-04", module: "2", moduleCode: "ASS", title: "Terminate Active Session" },
  { id: "UC-AGA-01", module: "3", moduleCode: "AGA", submodule: "3.1 AMA", title: "Configure Roles and Permissions" },
  { id: "UC-AGA-02", module: "3", moduleCode: "AGA", submodule: "3.1 AMA", title: "Assign User Access" },
  { id: "UC-AGA-03", module: "3", moduleCode: "AGA", submodule: "3.2 ARG", title: "Request Facility User Onboarding" },
  { id: "UC-AGA-04", module: "3", moduleCode: "AGA", submodule: "3.2 ARG", title: "Review Facility User Onboarding Request" },
  { id: "UC-AGA-05", module: "3", moduleCode: "AGA", submodule: "3.2 ARG", title: "Request Facility User Access Change" },
  { id: "UC-AGA-06", module: "3", moduleCode: "AGA", submodule: "3.2 ARG", title: "Review Facility User Access Change Request" },
  { id: "UC-AGA-07", module: "3", moduleCode: "AGA", submodule: "3.3 RTA", title: "Authorize Service Access" },
  { id: "UC-FMG-01", module: "4", moduleCode: "FMG", submodule: "4.1 FA", title: "Onboard Healthcare Facility" },
  { id: "UC-FMG-02", module: "4", moduleCode: "FMG", submodule: "4.1 FA", title: "Update Facility Information" },
  { id: "UC-FMG-03", module: "4", moduleCode: "FMG", submodule: "4.2 MAG", title: "Configure Facility Module Availability" },
  { id: "UC-FMG-04", module: "4", moduleCode: "FMG", submodule: "4.2 MAG", title: "Request Facility Module Change" },
  { id: "UC-FMG-05", module: "4", moduleCode: "FMG", submodule: "4.2 MAG", title: "Review Facility Module Change Request" },
  { id: "UC-OSO-01", module: "5", moduleCode: "OSO", title: "Review Operational & Security Information" },
  { id: "UC-OSO-02", module: "5", moduleCode: "OSO", title: "Generate Operational Report" }
];

export function useCaseTitle(id: Capability): string {
  return USE_CASES.find((u) => u.id === id)?.title ?? id;
}

export interface NavItem {
  href: string;
  label: string;
  description: string;
  capabilities: Capability[];
}

// Navigation is filtered by the actor's granted capabilities.
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    description: "Your role's administration overview",
    capabilities: []
  },
  {
    href: "/admin/identities",
    label: "Identities & Accounts",
    description: "UC-IAL-01 · UC-IAL-02",
    capabilities: ["UC-IAL-01", "UC-IAL-02"]
  },
  {
    href: "/admin/profile",
    label: "My Profile",
    description: "UC-IAL-03",
    capabilities: ["UC-IAL-03"]
  },
  {
    href: "/admin/sessions",
    label: "Auth & Sessions",
    description: "UC-ASS-04",
    capabilities: ["UC-ASS-04"]
  },
  {
    href: "/admin/access",
    label: "Access & Requests",
    description: "UC-AGA-01 → UC-AGA-06",
    capabilities: ["UC-AGA-01", "UC-AGA-02", "UC-AGA-03", "UC-AGA-04", "UC-AGA-05", "UC-AGA-06"]
  },
  {
    href: "/admin/authz",
    label: "Authorization (PDP)",
    description: "UC-AGA-07",
    capabilities: ["UC-AGA-07"]
  },
  {
    href: "/admin/facilities",
    label: "Facilities & Modules",
    description: "UC-FMG-01 → UC-FMG-05",
    capabilities: ["UC-FMG-01", "UC-FMG-02", "UC-FMG-03", "UC-FMG-04", "UC-FMG-05"]
  },
  {
    href: "/admin/oversight",
    label: "Oversight",
    description: "UC-OSO-01 · UC-OSO-02",
    capabilities: ["UC-OSO-01", "UC-OSO-02"]
  }
];

export function navFor(role: PortalActorRole): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.capabilities.length === 0 || canAny(role, item.capabilities)
  );
}

// Human-friendly role labels for the portal chrome.
export const ROLE_LABEL: Record<PortalActorRole, string> = {
  "WAH Central Administrator": "WAH Central Administrator",
  "Facility Administrator": "Facility Administrator",
  "Participating WAH Service": "Participating WAH Service",
  "WAH Service User": "WAH Service User"
};
