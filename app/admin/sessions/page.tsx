"use client";
// Module 2 — UC-ASS-04 Terminate Active Session (WAH Central Administrator).
import { useEffect, useState } from "react";
import { useActor } from "@/components/actor-context";
import NotAuthorized from "@/components/NotAuthorized";
import { api } from "@/lib/client";

interface Session { id: string; userId: string; service: string; startedAt: string; active: boolean }

export default function SessionsPage() {
  const { can } = useActor();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const d = await api<{ sessions: Session[] }>("/api/auth/sessions");
    setSessions(d.sessions);
  }
  useEffect(() => {
    if (can("UC-ASS-04")) load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!can("UC-ASS-04")) return <NotAuthorized />;

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
        <h2>Terminating Active Sessions</h2>
        <p className="muted">
          WAH Central Administrator only · UC-ASS-04 deliberate session termination.
          {msg && <strong> {msg}</strong>}
        </p>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Active &amp; historical sessions</h3>
        <table>
          <thead><tr><th>Session</th><th>User</th><th>Service</th><th>State</th><th>Action</th></tr></thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td><code>{s.id}</code><br /><span className="muted">{new Date(s.startedAt).toLocaleString()}</span></td>
                <td><code>{s.userId}</code></td>
                <td>{s.service}</td>
                <td>{s.active ? <span className="pill ok">active</span> : <span className="pill">terminated</span>}</td>
                <td>{s.active && <button className="danger" onClick={() => terminate(s.id)}>Terminate</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
