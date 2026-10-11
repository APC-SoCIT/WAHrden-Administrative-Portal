"use client";
// Role-scoped dashboard. Only the modules the acting actor is authorized for
// (per the V9 use-case diagrams) are surfaced, using /api/portal/overview.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useActor } from "@/components/actor-context";
import { api } from "@/lib/client";

interface Overview {
  counts: Record<string, number>;
  scopedFacilityIds: string[];
}

interface Card {
  href: string;
  tag: string;
  title: string;
  detail: string;
  useCases: string;
}

export default function AdminHome() {
  const { actor, can } = useActor();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    api<Overview>("/api/portal/overview")
      .then((d) => setCounts(d.counts))
      .catch(() => {});
  }, []);

  const stat = (key: string, suffix: string) =>
    counts[key] === undefined ? "…" : `${counts[key]} ${suffix}`;

  const cards: Card[] = [];
  if (can("UC-IAL-01") || can("UC-IAL-02")) {
    cards.push({
      href: "/admin/identities",
      tag: "Module 1 · IAL",
      title: "Governing User Identity & Accounts",
      detail: stat("users", "centralized identities"),
      useCases: "UC-IAL-01 · UC-IAL-02"
    });
  }
  if (can("UC-IAL-03")) {
    cards.push({
      href: "/admin/profile",
      tag: "Module 1 · IAL",
      title: "Update Own Profile",
      detail: "Self-maintained profile fields",
      useCases: "UC-IAL-03"
    });
  }
  if (can("UC-ASS-04")) {
    cards.push({
      href: "/admin/sessions",
      tag: "Module 2 · ASS",
      title: "Authenticating Users & Securing Sessions",
      detail: stat("activeSessions", "active sessions"),
      useCases: "UC-ASS-04"
    });
  }
  if (can("UC-AGA-01") || can("UC-AGA-02") || can("UC-AGA-03") || can("UC-AGA-04") || can("UC-AGA-05") || can("UC-AGA-06")) {
    const pending = counts.pendingOnboarding ?? 0;
    const pendingAccess = counts.pendingAccess ?? 0;
    cards.push({
      href: "/admin/access",
      tag: "Module 3 · AGA",
      title: "Governing User Access & Authorizing Services",
      detail: `${pending} onboarding · ${pendingAccess} access-change pending`,
      useCases: "UC-AGA-01 → UC-AGA-06"
    });
  }
  if (can("UC-AGA-07")) {
    cards.push({
      href: "/admin/authz",
      tag: "Module 3 · AGA (RTA)",
      title: "Authorizing Service Access",
      detail: stat("authorizations", "authorization decisions"),
      useCases: "UC-AGA-07"
    });
  }
  if (can("UC-FMG-01") || can("UC-FMG-02") || can("UC-FMG-03") || can("UC-FMG-04") || can("UC-FMG-05")) {
    cards.push({
      href: "/admin/facilities",
      tag: "Module 4 · FMG",
      title: "Governing Facilities & Configuring Modules",
      detail: `${stat("facilities", "facilities")} · ${counts.pendingModules ?? 0} module changes pending`,
      useCases: "UC-FMG-01 → UC-FMG-05"
    });
  }
  if (can("UC-OSO-01") || can("UC-OSO-02")) {
    cards.push({
      href: "/admin/oversight",
      tag: "Module 5 · OSO",
      title: "Monitoring Operations & Security",
      detail: stat("audit", "audit events retained"),
      useCases: "UC-OSO-01 · UC-OSO-02"
    });
  }

  return (
    <main>
      <div className="card">
        <span className="pill">Signed in as {actor.role}</span>
        <h2>{actor.displayName}</h2>
        <p className="muted">
          Your portal shows only the V9 use cases assigned to <strong>{actor.role}</strong>.
          Actions outside your role are refused by the server as well as hidden here.
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="card" style={{ marginTop: 16 }}>
          <p className="muted">No administration capabilities are assigned to this role.</p>
        </div>
      ) : (
        <div className="grid cols3" style={{ marginTop: 16 }}>
          {cards.map((c) => (
            <div className="card" key={c.href}>
              <span className="pill">{c.tag}</span>
              <h3 style={{ marginTop: 8 }}>{c.title}</h3>
              <p className="muted">{c.useCases}</p>
              <p><span className="pill">{c.detail}</span></p>
              <Link href={c.href}>Open →</Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
