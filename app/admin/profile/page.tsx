"use client";
// Module 1 — UC-IAL-03 Update Own Profile (Participating WAH Service).
// The participating service maintains only its own profile: no account
// lifecycle, no other-user data.
import { useEffect, useState } from "react";
import { useActor } from "@/components/actor-context";
import NotAuthorized from "@/components/NotAuthorized";
import { api } from "@/lib/client";

export default function ProfilePage() {
  const { actor, can } = useActor();
  const [fullName, setFullName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [msg, setMsg] = useState("");

  const canUpdate = can("UC-IAL-03");

  useEffect(() => {
    if (!canUpdate) return;
    api<{ user: { displayName: string; email: string; profile?: { fullName: string; contactEmail: string; contactPhone: string } } }>("/api/portal/profile")
      .then((d) => {
        const p = d.user.profile;
        setFullName(p?.fullName ?? d.user.displayName);
        setContactEmail(p?.contactEmail ?? d.user.email);
        setContactPhone(p?.contactPhone ?? "");
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!canUpdate) return <NotAuthorized />;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/portal/profile", { method: "PATCH", body: JSON.stringify({ fullName, contactEmail, contactPhone }) });
      setMsg("UC-IAL-03: your profile was updated.");
    } catch (e2) { setMsg("Error: " + (e2 instanceof Error ? e2.message : "failed")); }
  }

  return (
    <main>
      <div className="card">
        <span className="pill">Module 1 · Profile self-service</span>
        <h2>Participating WAH Service profile</h2>
        <p className="muted">Signed in as {actor.role} · UC-IAL-03. Only your own profile fields may be maintained.</p>
        {msg && <p className="muted">{msg}</p>}
      </div>
      <div className="card" style={{ marginTop: 16, maxWidth: 520 }}>
        <form onSubmit={save}>
          <label>Full name / service name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <label>Contact email</label>
          <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" />
          <label>Contact phone</label>
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          <button type="submit">Update own profile</button>
        </form>
      </div>
    </main>
  );
}