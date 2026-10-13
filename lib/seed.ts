import type {
  AccessAssignment,
  AuditEvent,
  Facility,
  FacilityModule,
  FunctionalModule,
  Notification,
  OnboardingRequest,
  Role,
  Session,
  User,
  AccessChangeRequest,
  ModuleChangeRequest
} from "./types";

export interface Seed {
  users: User[];
  roles: Role[];
  facilities: Facility[];
  access: AccessAssignment[];
  modules: FunctionalModule[];
  facilityModules: FacilityModule[];
  onboardingRequests: OnboardingRequest[];
  accessChangeRequests: AccessChangeRequest[];
  moduleChangeRequests: ModuleChangeRequest[];
  sessions: Session[];
  audit: AuditEvent[];
  notifications: Notification[];
}

const now = new Date().toISOString();
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const hoursAgo = (h: number) => minutesAgo(h * 60);

export function buildSeed(): Seed {
  return {
    users: [
      {
        id: "u-central-1",
        displayName: "Maria Santos (Central Admin)",
        email: "maria.santos@wah.example",
        phone: "+63-900-000-0001",
        status: "Active",
        portalRole: "WAH Central Administrator",
        createdAt: now,
        profile: {
          fullName: "Maria Santos",
          contactEmail: "maria.santos@wah.example",
          contactPhone: "+63-900-000-0001"
        },
        hasCredential: true,
        recoveryEnrolled: true
      },
      {
        id: "u-facility-1",
        displayName: "Jose Reyes (Facility Admin, Manila HC)",
        email: "jose.reyes@manilahc.example",
        status: "Active",
        portalRole: "Facility Administrator",
        createdAt: now,
        profile: {
          fullName: "Jose Reyes",
          contactEmail: "jose.reyes@manilahc.example",
          contactPhone: "+63-900-000-0002"
        },
        hasCredential: true,
        recoveryEnrolled: true
      },
      {
        id: "u-doctor-1",
        displayName: "Dr. Ana Lim (Physician, Manila HC)",
        email: "ana.lim@manilahc.example",
        status: "Active",
        portalRole: "WAH Service User",
        createdAt: now,
        profile: {
          fullName: "Dr. Ana Lim",
          contactEmail: "ana.lim@manilahc.example",
          contactPhone: "+63-900-000-0003"
        },
        hasCredential: true,
        recoveryEnrolled: true
      },
      {
        id: "u-nurse-1",
        displayName: "Nurse Rita Cruz (Cebu CH)",
        email: "rita.cruz@cebuch.example",
        status: "Inactive",
        portalRole: "WAH Service User",
        createdAt: now,
        profile: {
          fullName: "Rita Cruz",
          contactEmail: "rita.cruz@cebuch.example",
          contactPhone: "+63-900-000-0004"
        },
        hasCredential: true,
        recoveryEnrolled: false
      },
      {
        id: "u-service-1",
        displayName: "WAH4PC Service (Participating Service)",
        email: "service.wah4pc@services.wah.example",
        phone: "+63-900-000-0005",
        status: "Active",
        portalRole: "Participating WAH Service",
        createdAt: now,
        profile: {
          fullName: "WAH4PC Participating Service",
          contactEmail: "service.wah4pc@services.wah.example",
          contactPhone: "+63-900-000-0005"
        },
        hasCredential: true,
        recoveryEnrolled: true
      }
    ],
    roles: [
      {
        id: "r-central-admin",
        name: "WAH Central Administrator",
        description: "Centralized IAM governance over all facilities.",
        permissions: ["*"]
      },
      {
        id: "r-facility-admin",
        name: "Facility Administrator",
        description: "Facility-scoped onboarding and module requests.",
        permissions: [
          "onboarding.request",
          "accesschange.request",
          "modulechange.request",
          "facility.view"
        ]
      },
      {
        id: "r-physician",
        name: "Physician",
        description: "Primary-care consultations and e-Claims.",
        permissions: ["consultation.read", "consultation.write", "eclaims.submit"]
      },
      {
        id: "r-nurse",
        name: "Nurse",
        description: "Vitals capture and consultation read.",
        permissions: ["consultation.read", "vitals.write"]
      },
      {
        id: "r-billing",
        name: "In-patient Billing Clerk",
        description: "Hospital billing functions.",
        permissions: ["billing.read", "billing.write"]
      }
    ],
    facilities: [
      {
        id: "f-manila",
        code: "MNL-HC-01",
        name: "Manila Health Center",
        type: "Primary Care",
        region: "NCR",
        status: "Registered",
        updatedAt: now
      },
      {
        id: "f-cebu",
        code: "CEB-CH-02",
        name: "Cebu Community Hospital",
        type: "In-patient Hospital",
        region: "Region VII",
        status: "Registered",
        updatedAt: now
      }
    ],
    access: [
      {
        id: "a-1",
        userId: "u-facility-1",
        facilityId: "f-manila",
        roleId: "r-facility-admin",
        createdAt: now
      },
      {
        id: "a-2",
        userId: "u-doctor-1",
        facilityId: "f-manila",
        roleId: "r-physician",
        createdAt: now
      },
      {
        id: "a-3",
        userId: "u-nurse-1",
        facilityId: "f-cebu",
        roleId: "r-nurse",
        createdAt: now
      }
    ],
    modules: [
      { id: "m-consult", code: "CONSULT", name: "Consultations" },
      { id: "m-dialysis", code: "DIALYSIS", name: "Dialysis" },
      { id: "m-eclaims", code: "ECLAIMS", name: "e-Claims" },
      { id: "m-vitals", code: "VITALS", name: "Clinical Vitals" },
      { id: "m-billing", code: "BILLING", name: "In-patient Billing" }
    ],
    facilityModules: [
      { facilityId: "f-manila", moduleId: "m-consult", enabled: true },
      { facilityId: "f-manila", moduleId: "m-eclaims", enabled: true },
      { facilityId: "f-manila", moduleId: "m-dialysis", enabled: false },
      { facilityId: "f-cebu", moduleId: "m-vitals", enabled: true },
      { facilityId: "f-cebu", moduleId: "m-billing", enabled: true },
      { facilityId: "f-cebu", moduleId: "m-eclaims", enabled: false }
    ],
    onboardingRequests: [
      {
        id: "obr-1001",
        facilityId: "f-manila",
        requestedBy: "u-facility-1",
        prospectiveName: "Dr. Paolo Aquino",
        prospectiveEmail: "paolo.aquino@manilahc.example",
        requestedRoleId: "r-physician",
        requestedModuleIds: ["m-consult", "m-eclaims"],
        reason: "New OPD physician for Manila HC.",
        status: "Pending",
        createdAt: now
      }
    ],
    accessChangeRequests: [
      {
        id: "acr-2001",
        facilityId: "f-manila",
        targetUserId: "u-doctor-1",
        requestedBy: "u-facility-1",
        changeKind: "MODIFY",
        roleId: "r-physician",
        reason: "Extend vitals write to night shift.",
        status: "Pending",
        createdAt: now
      }
    ],
    moduleChangeRequests: [
      {
        id: "mcr-3001",
        facilityId: "f-manila",
        moduleId: "m-dialysis",
        requestedBy: "u-facility-1",
        desiredEnabled: true,
        reason: "Dialysis unit opens next quarter.",
        status: "Pending",
        createdAt: now
      }
    ],
    sessions: [
      {
        id: "s-1",
        userId: "u-doctor-1",
        service: "WAH4PC",
        startedAt: hoursAgo(2),
        active: true,
        device: "Chrome 126 · macOS",
        location: "Manila, PH",
        ip: "203.0.113.24"
      },
      {
        id: "s-2",
        userId: "u-facility-1",
        service: "WAH4Hospital",
        startedAt: minutesAgo(35),
        active: true,
        device: "Edge 126 · Windows 11",
        location: "Manila, PH",
        ip: "203.0.113.51"
      },
      {
        id: "s-3",
        userId: "u-doctor-1",
        service: "WAH4Hospital",
        startedAt: hoursAgo(9),
        endedAt: hoursAgo(8),
        active: false,
        device: "Safari 17 · iPadOS",
        location: "Quezon City, PH",
        ip: "203.0.113.77"
      },
      {
        id: "s-4",
        userId: "u-nurse-1",
        service: "WAH4PC",
        startedAt: hoursAgo(30),
        endedAt: hoursAgo(29),
        active: false,
        device: "Chrome 125 · Android 14",
        location: "Cebu City, PH",
        ip: "198.51.100.13"
      },
      {
        id: "s-5",
        userId: "u-service-1",
        service: "OpenHIM",
        startedAt: minutesAgo(12),
        active: true,
        device: "Service client · OpenHIM",
        location: "Singapore, SG",
        ip: "192.0.2.9"
      }
    ],
    audit: [
      {
        id: "audit-seed-1",
        at: now,
        actor: "system",
        actorRole: "WAHrden",
        action: "SEED",
        entity: "dataset",
        result: "success",
        detail: "Prototype dataset initialised (Modules 1-5 demo scope)."
      }
    ],
    notifications: [
      {
        id: "note-seed-1",
        at: minutesAgo(18),
        type: "FAILED_LOGIN",
        severity: "warning",
        subject: "ana.lim@manilahc.example",
        detail: "3 failed sign-in attempts within 10 minutes from 203.0.113.24 (Manila, PH).",
        count: 3
      },
      {
        id: "note-seed-2",
        at: hoursAgo(3),
        type: "UNAUTHORIZED_ACCESS",
        severity: "critical",
        subject: "u-nurse-1",
        detail: "Authorization denied: action 'billing.write' not granted at Cebu Community Hospital.",
        count: 1
      }
    ]
  };
}
