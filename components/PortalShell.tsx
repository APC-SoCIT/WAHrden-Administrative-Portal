"use client";
// Administration-portal chrome: session gate + role-filtered navigation.
// Only WAH Central Administrator, Facility Administrator and Participating WAH
// Service reach this shell; a WAH Service User is stopped at the sign-in gate.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { navFor } from "@/lib/access";
import { api } from "@/lib/client";
import { clearSession, getSession, type PortalSession } from "@/lib/session";
import { ActorContext, makeActorValue } from "./actor-context";

interface Alert {
  id: string;
  at: string;
  type: string;
  severity: "warning" | "critical";
  subject: string;
  detail: string;
  count: number;
}

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<PortalSession | null>(null);
  const [ready, setReady] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    setReady(true);
  }, [router]);

  const nav = useMemo(() => (session ? navFor(session.role) : []), [session]);
  const canSeeAlerts = session?.role === "WAH Central Administrator";

  useEffect(() => {
    if (!canSeeAlerts) return;
    api<{ notifications: Alert[] }>("/api/portal/notifications")
      .then((d) => setAlerts(d.notifications))
      .catch(() => {});
  }, [canSeeAlerts, pathname]);

  async function reset() {
    if (!confirm("Reset the demo dataset to seed?")) return;
    try {
      await api("/api/demo/reset", { method: "POST" });
      location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Reset failed");
    }
  }

  function signOut() {
    clearSession();
    router.replace("/login");
  }

  if (!ready || !session) {
    return (
      <div className="wrap">
        <div className="card" style={{ marginTop: 24 }}>
          <p className="muted">Checking session…</p>
        </div>
      </div>
    );
  }

  return (
    <ActorContext.Provider value={makeActorValue(session)}>
      <div className="shell">
        <aside className="sidebar">
          <div className="side-brand">
            <span className="brand">WAHrden</span>
            <small>Admin Portal · prototype</small>
          </div>
          <nav className="sidenav">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={pathname === item.href ? "active" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="side-foot">
            <div className="actor">
              <span className="pill ok">{session.role}</span>
              <div className="actor-name">{session.displayName}</div>
            </div>
            <div className="row">
              <button className="secondary" onClick={reset}>Reset demo</button>
              <button className="secondary" onClick={signOut}>Sign out</button>
            </div>
          </div>
        </aside>
        <div className="main">
          <header className="appbar">
            <span className="appbar-title">WAHrden Administration Portal</span>
            <div className="row" style={{ gap: 12 }}>
              {canSeeAlerts && (
                <div className="bell-wrap">
                  <button
                    className="secondary bell"
                    onClick={() => setShowAlerts((v) => !v)}
                    title="Security alerts"
                  >
                    Alerts {alerts.length > 0 && <span className="badge">{alerts.length}</span>}
                  </button>
                  {showAlerts && (
                    <div className="bell-panel">
                      <h4>Security alerts (UC-OSO-01)</h4>
                      {alerts.length === 0 && <p className="muted">No alerts.</p>}
                      {alerts.map((a) => (
                        <div key={a.id} className={`alert ${a.severity}`}>
                          <div>
                            <strong>{a.type.replace(/_/g, " ")}</strong>{" "}
                            {a.count > 1 && <span className="pill warn">×{a.count}</span>}
                          </div>
                          <div className="muted">{a.subject}</div>
                          <div>{a.detail}</div>
                          <div className="muted">{new Date(a.at).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <span className="muted">{session.email}</span>
            </div>
          </header>
          <div className="wrap">{children}</div>
        </div>
      </div>
    </ActorContext.Provider>
  );
}
