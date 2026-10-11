"use client";
// Module 5 — UC-OSO-01 review + UC-OSO-02 report generation.
import { useEffect, useState } from "react";
import { useActor } from "@/components/actor-context";
import NotAuthorized from "@/components/NotAuthorized";
import { api } from "@/lib/client";

interface Ev { id: string; at: string; actor: string; action: string; entity: string; result: string; detail?: string }

export default function OversightPage() {
  const { can } = useActor();
  const [events, setEvents] = useState<Ev[]>([]);
  const [q, setQ] = useState("");
  const [result, setResult] = useState("");
  const [scope, setScope] = useState("all");
  const [report, setReport] = useState<object | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const d = await api<{ events: Ev[] }>(`/api/oversight?q=${encodeURIComponent(q)}&result=${result}`);
    setEvents(d.events);
  }
  useEffect(() => {
    if (can("UC-OSO-01") || can("UC-OSO-02")) load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!can("UC-OSO-01") && !can("UC-OSO-02")) return <NotAuthorized />;

  async function generate() {
    setMsg("");
    try {
      const d = await api<{ report: object }>("/api/oversight", {
        method: "POST", body: JSON.stringify({ scope })
      });
      setReport(d.report);
      load();
    } catch (e) { setMsg("Error: " + (e instanceof Error ? e.message : "failed")); }
  }

  return (
    <main>
      <div className="card">
        <span className="pill">Module 5 · Operational &amp; Security Oversight</span>
        <h2>Monitoring Operations &amp; Security</h2>
        <p className="muted">Review-only: inspecting information never mutates governed state (UC-OSO-01).</p>
      </div>
      <div className="grid cols2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>UC-OSO-01 · Review operational &amp; security information</h3>
          <div className="row">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actor, action, detail…" style={{ maxWidth: 240 }} />
            <select value={result} onChange={(e) => setResult(e.target.value)} style={{ maxWidth: 160 }}>
              <option value="">any result</option>
              <option value="success">success</option>
              <option value="Authorized">Authorized</option>
              <option value="Denied">Denied</option>
            </select>
            <button className="secondary" onClick={load}>Filter</button>
          </div>
          <table style={{ marginTop: 8 }}>
            <thead><tr><th>When</th><th>Actor → action</th><th>Result</th></tr></thead>
            <tbody>{events.slice(0, 60).map((e) => (
              <tr key={e.id}>
                <td><span className="muted">{new Date(e.at).toLocaleString()}</span></td>
                <td><code>{e.actor}</code> · {e.action}<br /><span className="muted">{e.entity} · {e.detail}</span></td>
                <td>{e.result === "Denied" ? <span className="pill deny">Denied</span> : e.result === "Authorized" ? <span className="pill ok">Authorized</span> : <span className="pill">{e.result}</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="card">
          <h3>UC-OSO-02 · Generate operational report</h3>
          <label>Report scope (from already-maintained information)</label>
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">all</option>
            <option value="authz">authz (authorization decisions)</option>
            <option value="governance">governance (admin actions)</option>
            <option value="sessions">sessions (auth/session events)</option>
          </select>
          <button onClick={generate}>Generate report</button>
          {msg && <p className="muted">{msg}</p>}
          {report && <pre className="eval">{JSON.stringify(report, null, 2)}</pre>}
        </div>
      </div>
    </main>
  );
}
