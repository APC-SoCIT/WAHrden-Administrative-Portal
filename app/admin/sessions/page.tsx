"use client";
// Module 2 — UC-ASS-04 Terminate Active Session.
// Two sections: Active Sessions (all current) and Historical Sessions
// (per user, filterable by date/time). Each record carries device + location.
import { useEffect, useMemo, useState } from "react";
import { useActor } from "@/components/actor-context";
import NotAuthorized from "@/components/NotAuthorized";
import { api } from "@/lib/client";

interface Session {
  id: string; userId: string; service: string;
  startedAt: string; endedAt?: string; active: boolean;
  device: string; location: string; ip: string;
}
interface User { id: string; displayName: string; email: string }

function duration(from: string, to?: string): string {
  const ms = (to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime();
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}

export default function SessionsPage() {
  const { can } = useActor();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [msg, setMsg] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    const d = await api<{ sessions: Session[] }>("/api/auth/sessions");
    setSessions(d.sessions);
    const u = await api<{ users: User[] }>("/api/governance/users").catch(() => ({ users: [] }));
    setUsers(u.users);
  }
  useEffect(() => {
    if (can("UC-ASS-04")) load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const names = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of users) m.set(u.id, u.displayName || u.email);
    return m;
  }, [users]);
  const userName = (id: string) => names.get(id) ?? id;

  if (!can("UC-ASS-04")) return <NotAuthorized />;

  const active = sessions.filter((s) => s.active);
  const historical = sessions
    .filter((s) => !s.active)
    .filter((s) => (userFilter ? s.userId === userFilter : true))
    .filter((s) => (from ? s.startedAt >= from : true))
    .filter((s) => (to ? s.startedAt <= to : true))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  async function terminate(id: string) {
    try {
      await api(`/api/auth/sessions?id=${id}`, { method: "DELETE" });
      setMsg(`UC-ASS-04: session ${id} terminated.`);
      load();
    } catch (e) { setMsg("Error: " + (e instanceof Error ? e.message : "failed")); }
  }

  return (
    <main>
      <div className="card">
        <span className="pill">Module 2 · Authentication &amp; Session Security</span>
        <h2>Session Governance</h2>
        <p className="muted">
          WAH Central Administrator only · UC-ASS-04. {active.length} active ·{" "}
          {sessions.length - active.length} historical.
          {msg && <strong> {msg}</strong>}
        </p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Active Sessions</h3>
        <p className="muted">All currently authenticated sessions across services.</p>
        <table>
          <thead>
            <tr>
              <th>User</th><th>Service</th><th>Device</th><th>Location</th>
              <th>IP</th><th>Started</th><th>Duration</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {active.length === 0 && (
              <tr><td colSpan={8} className="muted">No active sessions.</td></tr>
            )}
            {active.map((s) => (
              <tr key={s.id}>
                <td>{userName(s.userId)}<br /><span className="muted"><code>{s.id}</code></span></td>
                <td>{s.service}</td>
                <td>{s.device}</td>
                <td>{s.location}</td>
                <td><code>{s.ip}</code></td>
                <td><span className="muted">{new Date(s.startedAt).toLocaleString()}</span></td>
                <td>{duration(s.startedAt)}</td>
                <td><button className="danger" onClick={() => terminate(s.id)}>Terminate</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Historical Sessions</h3>
        <p className="muted">Terminated / ended sessions. Filter by user and date range.</p>
        <div className="row" style={{ marginBottom: 8 }}>
          <div>
            <label>User</label>
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
              <option value="">All users</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.displayName || u.email}</option>)}
            </select>
          </div>
          <div>
            <label>From</label>
            <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label>To</label>
            <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button className="secondary" onClick={() => { setUserFilter(""); setFrom(""); setTo(""); }}>
            Clear
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>User</th><th>Service</th><th>Device</th><th>Location</th>
              <th>Started</th><th>Ended</th><th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {historical.length === 0 && (
              <tr><td colSpan={7} className="muted">No historical sessions match the filters.</td></tr>
            )}
            {historical.map((s) => (
              <tr key={s.id}>
                <td>{userName(s.userId)}<br /><span className="muted"><code>{s.id}</code></span></td>
                <td>{s.service}</td>
                <td>{s.device}</td>
                <td>{s.location}</td>
                <td><span className="muted">{new Date(s.startedAt).toLocaleString()}</span></td>
                <td><span className="muted">{s.endedAt ? new Date(s.endedAt).toLocaleString() : "—"}</span></td>
                <td>{duration(s.startedAt, s.endedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
