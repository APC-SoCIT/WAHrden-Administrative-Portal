// Canonical permission vocabulary used by the UC-AGA-01 role configuration UI.
// Grouped purely for presentation; the flat value is what a role stores.
export interface PermissionGroup {
  group: string;
  permissions: { value: string; label: string }[];
}

export const PERMISSION_CATALOG: PermissionGroup[] = [
  {
    group: "Consultation",
    permissions: [
      { value: "consultation.read", label: "View consultations" },
      { value: "consultation.write", label: "Record consultations" }
    ]
  },
  {
    group: "Clinical Vitals",
    permissions: [
      { value: "vitals.read", label: "View vitals" },
      { value: "vitals.write", label: "Capture vitals" }
    ]
  },
  {
    group: "e-Claims",
    permissions: [{ value: "eclaims.submit", label: "Submit e-Claims" }]
  },
  {
    group: "In-patient Billing",
    permissions: [
      { value: "billing.read", label: "View billing" },
      { value: "billing.write", label: "Process billing" }
    ]
  },
  {
    group: "Facility Requests",
    permissions: [
      { value: "onboarding.request", label: "Request user onboarding" },
      { value: "accesschange.request", label: "Request access change" },
      { value: "modulechange.request", label: "Request module change" },
      { value: "facility.view", label: "View facility modules" }
    ]
  }
];

export const ALL_PERMISSIONS = PERMISSION_CATALOG.flatMap((g) =>
  g.permissions.map((p) => p.value)
);
