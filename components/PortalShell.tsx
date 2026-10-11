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

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<PortalSession | null>(null);
  const [ready, setReady] = useState(false);

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
      <div className="topbar">
        <div className="brand">
          WAHrden Admin Portal <small>Identity &amp; Access Governance · prototype</small>
        </div>
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={pathname === item.href ? { color: "#fff", fontWeight: 700 } : undefined}
          >
            {item.label}
          </Link>
        ))}
        <div className="actorbar">
          <span className="pill ok">{session.role}</span>
          <span>{session.displayName}</span>
          <button className="secondary" onClick={reset} style={{ padding: "6px 10px" }}>
            Reset demo
          </button>
          <button className="secondary" onClick={signOut} style={{ padding: "6px 10px" }}>
            Sign out
          </button>
        </div>
      </div>
      <div className="wrap">{children}</div>
    </ActorContext.Provider>
  );
}
