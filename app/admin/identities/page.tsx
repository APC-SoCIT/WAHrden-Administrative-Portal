"use client";
// Module 1 — UC-IAL-01 / UC-IAL-02 (WAH Central Administrator).
import { useEffect, useState } from "react";
import { useActor } from "@/components/actor-context";
import NotAuthorized from "@/components/NotAuthorized";
import { api } from "@/lib/client";

interface User {
  id: string; displayName: string; email: string; status: string; portalRole: string;
}

export default function IdentitiesPage() {
  const { can } = useActor();
  const [users, setUsers] = useState<User[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  async function load() {
    const d = await api<{ users: User[] }>(`/api/governance/users?q=${encodeURIComponent(q)}`);
    setUsers(d.users);
  }
  useEffect(() => {
    if (can("UC-IAL-01") || can("UC-IAL-02")) load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!can("UC-IAL-01") && !can("UC-IAL-02")) return <NotAuthorized />;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      const d = await api<{ user: User }>("/api/governance/users", {
        method: "POST", body: JSON.stringify({ displayName: name, email })
      });
      setMsg(`UC-IAL-01: created ${d.user.email}. No facility access was assigned (by design).`);
      setName(""); setEmail(""); load();
    } catch (e2) { setMsg("Error: " + (e2 instanceof Error ? e2.message : "failed")); }
  }

  async function setStatus(id: string, status: string) {
    setMsg("");
    try {
      await api(`/api/governance/users/${id}`, {
        method: "PATCH", body: JSON.stringify({ status })
      });
      setMsg(`UC-IAL-02: status → ${status}. Inactive/Retired also invalidates sessions.`);
      load();
    } catch (e2) { setMsg("Error: " + (e2 instanceof Error ? e2.message : "failed")); }
  }

  return (
    <main>
      <div className="card">
        <span className="pill">Module 1 · Identity &amp; Account Lifecycle</span>
        <h2>Governing User Identity &amp; Accounts</h2>
        <p className="muted">WAH Central Administrator only · UC-IAL-01 · UC-IAL-02</p>
        {msg && <p className="muted">{msg}</p>}
      </div>
      <div className="grid cols2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>UC-IAL-01 · Create User Account</h3>
          <p className="muted">Account creation never auto-assigns facility access (V9 separation rule).</p>
          <form onSubmit={create}>
            <label>Display name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Paolo Aquino" />
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="paolo.aquino@manilahc.example" />
            <button type="submit">Create centralized account</button>
          </form>
        </div>
        <div className="card">
          <h3>UC-IAL-02 · Change Account Status</h3>
          <div className="row">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search accounts…" style={{ maxWidth: 220 }} />
            <button className="secondary" onClick={load}>Search</button>
          </div>
          <table style={{ marginTop: 8 }}>
            <thead><tr><th>Account</th><th>Type</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.displayName}<br /><span className="muted">{u.email}</span></td>
                  <td><span className="muted">{u.portalRole}</span></td>
                  <td><span className="pill">{u.status}</span></td>
                  <td>
                    <div className="row">
                      <button className="secondary" onClick={() => setStatus(u.id, "Active")}>Active</button>
                      <button className="secondary" onClick={() => setStatus(u.id, "Inactive")}>Inactive</button>
                      <button className="secondary" onClick={() => setStatus(u.id, "Retired")}>Retire</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
