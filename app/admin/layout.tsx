import PortalShell from "@/components/PortalShell";

// Every /admin route is behind the portal session gate (see PortalShell).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
