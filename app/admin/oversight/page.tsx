"use client";
// Module 5 — UC-OSO-01 review + UC-OSO-02 report generation.
import { useEffect, useMemo, useState } from "react";
import { useActor } from "@/components/actor-context";
import NotAuthorized from "@/components/NotAuthorized";
import { api } from "@/lib/client";

interface Ev { id: string; at: string; actor: string; action: string; entity: string; result: string; detail?: string }
interface Facility { id: string; code: string; name: string }

function Bars({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="chart">
      <h4>{title}</h4>
      {data.length === 0 && <p className="muted">No data.</p>}
      {data.map((d) => (
        <div key={d.label} className="chart-row">
          <span className="chart-label" title={d.label}>{d.label}</span>
          <span className="chart-track">
            <span className="chart-bar" style={{ width: `${(d.value / max) * 100}%` }} />
          </span>
          <span className="chart-value">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function OversightPage() {
  const { can } = useActor();
  const [events, setEvents] = useState<Ev[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [q, setQ] = useState("");
  const [actor, setActor] = useState("");
  const [result, setResult] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [scope, setScope] = useState("all");
  const [report, setReport] = useState<object | null>(null);
  const [msg, setMsg] = useState("");

  const params = () =>
    new URLSearchParams({ q, actor, result, facilityId }).toString();

  async function load() {
    const d = await api<{ events: Ev[] }>(`/api/oversight?${params()}`);
    setEvents(d.events);
  }
  useEffect(() => {
    if (can("UC-OSO-01") || can("UC-OSO-02")) {
      load().catch(() => {});
      api<{ facilities: Facility[] }>("/api/governance/facilities")
        .then((d) => setFacilities(d.facilities))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const charts = useMemo(() => {
    const byResult: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    for (const e of events) {
      const r = e.result === "failure" ? "failed" : e.result === "success" ? "success" : e.result;
      byResult[r] = (byResult[r] ?? 0) + 1;
      byAction[e.action] = (byAction[e.action] ?? 0) + 1;
      const day = e.at.slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
    }
    return {
      results: Object.entries(byResult).map(([label, value]) => ({ label, value })),
      actions: Object.entries(byAction)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([label, value]) => ({ label, value })),
      days: Object.entries(byDay)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-7)
        .map(([label, value]) => ({ label, value }))
    };
  }, [events]);

  if (!can("UC-OSO-01") && !can("UC-OSO-02")) return <NotAuthorized />;

  async function generate() {
    setMsg("");
    try {
      const d = await api<{ report: object }>("/api/oversight", {
        method: "POST", body: JSON.stringify({ scope, facilityId })
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

      <div className="grid cols3" style={{ marginTop: 16 }}>
        <div className="card"><Bars title="Events by outcome" data={charts.results} /></div>
        <div className="card"><Bars title="Top actions" data={charts.actions} /></div>
        <div className="card"><Bars title="Events by day (last 7)" data={charts.days} /></div>
      </div>

      <div className="grid cols2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>UC-OSO-01 · Review operational &amp; security information</h3>
          <div className="row">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actor, action, detail…" style={{ maxWidth: 200 }} />
            <input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="User (email)…" style={{ maxWidth: 160 }} />
            <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)} style={{ maxWidth: 200 }}>
              <option value="">any facility</option>
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.code})</option>)}
            </select>
            <select value={result} onChange={(e) => setResult(e.target.value)} style={{ maxWidth: 140 }}>
              <option value="">any outcome</option>
              <option value="success">success</option>
              <option value="failed">failed</option>
            </select>
            <button className="secondary" onClick={load}>Filter</button>
            <button className="secondary" onClick={() => { setQ(""); setActor(""); setResult(""); setFacilityId(""); load(); }}>Clear</button>
          </div>
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table>
              <thead><tr><th>When</th><th>Actor → action</th><th>Result</th></tr></thead>
              <tbody>{events.slice(0, 60).map((e) => (
                <tr key={e.id}>
                  <td><span className="muted">{new Date(e.at).toLocaleString()}</span></td>
                  <td><code>{e.actor}</code> · {e.action}<br /><span className="muted">{e.entity} · {e.detail}</span></td>
                  <td>{e.result === "Denied" || e.result === "failure" ? <span className="pill deny">{e.result}</span> : e.result === "Authorized" ? <span className="pill ok">Authorized</span> : <span className="pill">{e.result}</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
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
          <label>Facility (optional)</label>
          <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
            <option value="">all facilities</option>
            {facilities.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.code})</option>)}
          </select>
          <button onClick={generate}>Generate report</button>
          {msg && <p className="muted">{msg}</p>}
          {report && <pre className="eval">{JSON.stringify(report, null, 2)}</pre>}
        </div>
      </div>
    </main>
  );
}
