"use client";
// Module 1 — UC-IAL-01 / UC-IAL-02 (WAH Central Administrator).
// Account status is a two-state control: Active <-> Deactivate. Deactivating
// also terminates the account's active sessions (Module 2 alignment), and the
// per-account panel exposes active + historical session termination here.
import { useEffect, useMemo, useState } from "react";
import { useActor } from "@/components/actor-context";
import NotAuthorized from "@/components/NotAuthorized";
import { api } from "@/lib/client";

interface User { id: string; displayName: string; email: string; status: string; portalRole: string }
interface Session {
  id: string; userId: string; service: string; startedAt: string; endedAt?: string;
  active: boolean; device: string; location: string; ip: string;
}

export default function IdentitiesPage() {
  const { can } = useActor();
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<User | null>(null);

  const canRead = can("UC-IAL-01") || can("UC-IAL-02");

  async function load() {
    const d = await api<{ users: User[] }>(`/api/governance/users?q=${encodeURIComponent(q)}`);
    setUsers(d.users);
    const s = await api<{ sessions: Session[] }>("/api/auth/sessions").catch(() => ({ sessions: [] }));
    setSessions(s.sessions);
  }
  useEffect(() => {
    if (canRead) load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sessions) if (s.active) m.set(s.userId, (m.get(s.userId) ?? 0) + 1);
    return m;
  }, [sessions]);

  if (!canRead) return <NotAuthorized />;

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

  async function setStatus(user: User, status: "Active" | "Inactive") {
    setMsg("");
    try {
      const d = await api<{ terminatedSessions: number }>(`/api/governance/users/${user.id}`, {
        method: "PATCH", body: JSON.stringify({ status })
      });
      setMsg(
        status === "Inactive"
          ? `UC-IAL-02: ${user.email} deactivated; ${d.terminatedSessions} active session(s) terminated.`
          : `UC-IAL-02: ${user.email} reactivated.`
      );
      load();
    } catch (e2) { setMsg("Error: " + (e2 instanceof Error ? e2.message : "failed")); }
  }

  async function terminate(sessionId: string) {
    try {
      await api(`/api/auth/sessions?id=${sessionId}`, { method: "DELETE" });
      setMsg(`UC-ASS-04: session ${sessionId} terminated.`);
      load();
    } catch (e2) { setMsg("Error: " + (e2 instanceof Error ? e2.message : "failed")); }
  }

  const selSessions = selected ? sessions.filter((s) => s.userId === selected.id) : [];
  const selActive = selSessions.filter((s) => s.active);
  const selHistorical = selSessions.filter((s) => !s.active);

  return (
    <main>
      <div className="card">
        <span className="pill">Module 1 · Identity &amp; Account Lifecycle</span>
        <h2>Governing User Identity &amp; Accounts</h2>
        <p className="muted">WAH Central Administrator only · UC-IAL-01 · UC-IAL-02 · UC-ASS-04 (Module 2)</p>
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
          <h3>UC-IAL-02 · Account status</h3>
          <p className="muted">
            Only <strong>Active</strong> and <strong>Deactivate</strong> are offered.
            Deactivation is system-managed (the resulting Inactive state) and also
            terminates the account&apos;s active sessions.
          </p>
          <div className="row">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search accounts…" style={{ maxWidth: 220 }} />
            <button className="secondary" onClick={load}>Search</button>
          </div>
          <table style={{ marginTop: 8 }}>
            <thead><tr><th>Account</th><th>Type</th><th>Status</th><th>Sessions</th><th>Action</th></tr></thead>
            <tbody>
              {users.map((u) => {
                const ac = activeCount.get(u.id) ?? 0;
                const active = u.status === "Active";
                return (
                  <tr key={u.id}>
                    <td>{u.displayName}<br /><span className="muted">{u.email}</span></td>
                    <td><span className="muted">{u.portalRole}</span></td>
                    <td>
                      {active
                        ? <span className="pill ok">Active</span>
                        : <span className="pill deny">Deactivated</span>}
                    </td>
                    <td>
                      {ac > 0 ? <span className="pill warn">{ac} active</span> : <span className="muted">none</span>}
                    </td>
                    <td>
                      <div className="row">
                        {active
                          ? <button className="secondary" onClick={() => setStatus(u, "Inactive")}>Deactivate</button>
                          : <button className="secondary" onClick={() => setStatus(u, "Active")}>Activate</button>}
                        <button className="secondary" onClick={() => setSelected(u)}>Manage sessions</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3 style={{ margin: 0 }}>Sessions · {selected.displayName} <span className="muted">(Module 2)</span></h3>
            <button className="secondary" onClick={() => setSelected(null)}>Close</button>
          </div>
          <h4>Active sessions</h4>
          <table>
            <thead><tr><th>Session</th><th>Service</th><th>Device</th><th>Location</th><th>Started</th><th>Action</th></tr></thead>
            <tbody>
              {selActive.length === 0 && <tr><td colSpan={6} className="muted">No active sessions.</td></tr>}
              {selActive.map((s) => (
                <tr key={s.id}>
                  <td><code>{s.id}</code></td>
                  <td>{s.service}</td>
                  <td>{s.device}</td>
                  <td>{s.location}</td>
                  <td><span className="muted">{new Date(s.startedAt).toLocaleString()}</span></td>
                  <td><button className="danger" onClick={() => terminate(s.id)}>Terminate</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4 style={{ marginTop: 12 }}>Historical sessions</h4>
          <table>
            <thead><tr><th>Session</th><th>Service</th><th>Device</th><th>Location</th><th>Started</th><th>Ended</th></tr></thead>
            <tbody>
              {selHistorical.length === 0 && <tr><td colSpan={6} className="muted">No historical sessions.</td></tr>}
              {selHistorical.map((s) => (
                <tr key={s.id}>
                  <td><code>{s.id}</code></td>
                  <td>{s.service}</td>
                  <td>{s.device}</td>
                  <td>{s.location}</td>
                  <td><span className="muted">{new Date(s.startedAt).toLocaleString()}</span></td>
                  <td><span className="muted">{s.endedAt ? new Date(s.endedAt).toLocaleString() : "—"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
