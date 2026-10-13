"use client";
// Module 4 (FMG) — per-actor sections:
//   WAH Central Administrator: UC-FMG-01 onboard, UC-FMG-02 update info,
//                              UC-FMG-03 configure module availability, UC-FMG-05 review requests
//   Facility Administrator:    UC-FMG-04 request module change (facility-scoped)
import { useEffect, useState } from "react";
import { useActor } from "@/components/actor-context";
import NotAuthorized from "@/components/NotAuthorized";
import { api } from "@/lib/client";

interface Facility { id: string; code: string; name: string; type: string; region: string; status: string }
interface Req { id: string; status: string; facilityId: string; moduleId: string; desiredEnabled: boolean }

export default function FacilitiesPage() {
  const { actor, can } = useActor();
  const canOnboard = can("UC-FMG-01");
  const canUpdate = can("UC-FMG-02");
  const canConfigure = can("UC-FMG-03");
  const canRequest = can("UC-FMG-04");
  const canReview = can("UC-FMG-05");
  const isCentral = canOnboard || canUpdate || canConfigure || canReview;

  const [facs, setFacs] = useState<Facility[]>([]);
  const [mods, setMods] = useState<{ id: string; code: string; name: string }[]>([]);
  const [fm, setFm] = useState<{ facilityId: string; moduleId: string; enabled: boolean }[]>([]);
  const [mcr, setMcr] = useState<Req[]>([]);
  const [scoped, setScoped] = useState<string[] | null>(null);
  const [msg, setMsg] = useState("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [uFac, setUFac] = useState("");
  const [uName, setUName] = useState("");
  const [uRegion, setURegion] = useState("");
  const [cFac, setCFac] = useState("");
  const [cModule, setCModule] = useState("");
  const [cEnabled, setCEnabled] = useState(true);
  const [rFac, setRFac] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);

  async function load() {
    const d = await api<{ facilities: Facility[]; modules: typeof mods; facilityModules: typeof fm }>("/api/governance/facilities");
    setFacs(d.facilities); setMods(d.modules); setFm(d.facilityModules);
    if (canReview) {
      const m = await api<{ requests: Req[] }>("/api/governance/module-change-requests");
      setMcr(m.requests);
    }
    if (!isCentral) {
      const o = await api<{ scopedFacilityIds: string[] }>("/api/portal/overview");
      setScoped(o.scopedFacilityIds);
    }
  }
  useEffect(() => {
    if (isCentral || canRequest) load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isCentral && !canRequest) return <NotAuthorized />;

  const visible = scoped ? facs.filter((f) => scoped.includes(f.id)) : facs;
  const visibleIds = visible.map((f) => f.id);
  const facLabel = (id: string) => facs.find((f) => f.id === id)?.name ?? id;
  const modLabel = (id: string) => mods.find((m) => m.id === id)?.name ?? id;

  async function onboard(e: React.FormEvent) {
    e.preventDefault();
    setStatusBusy(true);
    try {
      await api("/api/governance/facilities", { method: "POST", body: JSON.stringify({ name, code }) });
      setMsg(`UC-FMG-01: facility ${code} registered.`); setName(""); setCode(""); await load();
    } catch (e2) { setMsg("Error: " + (e2 instanceof Error ? e2.message : "failed")); }
    finally { setStatusBusy(false); }
  }

  async function updateInfo(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api(`/api/governance/facilities/${uFac}`, { method: "PATCH", body: JSON.stringify({ name: uName, region: uRegion }) });
      setMsg("UC-FMG-02: facility information updated."); await load();
    } catch (e2) { setMsg("Error: " + (e2 instanceof Error ? e2.message : "failed")); }
  }

  async function configure() {
    try {
      await api(`/api/governance/facilities/${cFac}`, {
        method: "PATCH", body: JSON.stringify({ moduleChanges: [{ moduleId: cModule, enabled: cEnabled }] })
      });
      setMsg("UC-FMG-03: module availability applied directly."); await load();
    } catch (e2) { setMsg("Error: " + (e2 instanceof Error ? e2.message : "failed")); }
  }

  async function requestChange() {
    try {
      await api("/api/governance/module-change-requests", {
        method: "POST",
        body: JSON.stringify({ facilityId: rFac, moduleId: cModule, desiredEnabled: cEnabled, requestedBy: actor.userId })
      });
      setMsg("UC-FMG-04: module-change request → Pending. Availability unchanged."); await load();
    } catch (e2) { setMsg("Error: " + (e2 instanceof Error ? e2.message : "failed")); }
  }

  async function decide(id: string, decision: string) {
    try {
      await api(`/api/governance/module-change-requests/${id}/decision`, { method: "POST", body: JSON.stringify({ decision }) });
      setMsg(`UC-FMG-05: ${decision} recorded. Apply via UC-FMG-03 “Configure”.`); await load();
    } catch (e2) { setMsg("Error: " + (e2 instanceof Error ? e2.message : "failed")); }
  }

  return (
    <main>
      <div className="card">
        <span className="pill">Module 4 · Facility &amp; Module Governance</span>
        <h2>Governing Facilities &amp; Configuring Modules</h2>
        <p className="muted">Signed in as {actor.role}</p>
        {msg && <p className="muted">{msg}</p>}
      </div>

      {isCentral && (
        <div className="grid cols2" style={{ marginTop: 16 }}>
          {canOnboard && (
            <div className="card">
              <h3>UC-FMG-01 · Onboard healthcare facility</h3>
              <form onSubmit={onboard}>
                <label>Facility name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Davao Health Center" />
                <label>Facility code</label>
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="DVO-HC-03" />
                <button type="submit" disabled={statusBusy}>Register facility</button>
              </form>
            </div>
          )}
          {canUpdate && (
            <div className="card">
              <h3>UC-FMG-02 · Update facility information</h3>
              <form onSubmit={updateInfo}>
                <label>Facility</label>
                <select value={uFac} onChange={(e) => setUFac(e.target.value)}>
                  <option value="">Select facility…</option>
                  {facs.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <label>New name (optional)</label>
                <input value={uName} onChange={(e) => setUName(e.target.value)} />
                <label>New region (optional)</label>
                <input value={uRegion} onChange={(e) => setURegion(e.target.value)} />
                <button type="submit">Update information</button>
              </form>
            </div>
          )}
        </div>
      )}

      <div className="grid cols2" style={{ marginTop: 16 }}>
        {canConfigure && (
          <div className="card">
            <h3>UC-FMG-03 · Configure module availability (direct)</h3>
            <label>Facility</label>
            <select value={cFac} onChange={(e) => setCFac(e.target.value)}>
              <option value="">Select facility…</option>
              {facs.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <p className="muted">Modules: {mods.map((m) => <code key={m.id} style={{ marginRight: 4 }}>{m.code}</code>)}</p>
            <label>Module</label>
            <select value={cModule} onChange={(e) => setCModule(e.target.value)}>
              <option value="">Select module…</option>
              {mods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <label>Availability</label>
            <select value={String(cEnabled)} onChange={(e) => setCEnabled(e.target.value === "true")}>
              <option value="true">enabled</option><option value="false">disabled</option>
            </select>
            <button onClick={configure}>Apply availability</button>
          </div>
        )}
        {canRequest && (
          <div className="card">
            <h3>UC-FMG-04 · Request module change</h3>
            <p className="muted">Facility Administrator submits a request for central review.</p>
            <label>Facility</label>
            <select value={rFac} onChange={(e) => setRFac(e.target.value)}>
              <option value="">Select facility…</option>
              {visible.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <label>Module</label>
            <select value={cModule} onChange={(e) => setCModule(e.target.value)}>
              <option value="">Select module…</option>
              {mods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <label>Desired availability</label>
            <select value={String(cEnabled)} onChange={(e) => setCEnabled(e.target.value === "true")}>
              <option value="true">enable</option><option value="false">disable</option>
            </select>
            <button className="secondary" onClick={requestChange}>Submit module-change request</button>
          </div>
        )}
        <div className="card">
          <h3>{isCentral ? "Registered facilities" : "Your facility"}</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Facility</th><th>Status</th></tr></thead>
              <tbody>{visible.map((f) => (
                <tr key={f.id}><td>{f.name}<br /><span className="muted">{f.code} · {f.type} · {f.region}</span></td><td><span className="pill">{f.status}</span></td></tr>
              ))}</tbody>
            </table>
          </div>
          <h3 style={{ marginTop: 12 }}>Module availability</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Facility</th><th>Module</th><th>State</th></tr></thead>
              <tbody>{fm.filter((r) => visibleIds.includes(r.facilityId)).map((r, i) => (
                <tr key={i}><td>{facLabel(r.facilityId)}</td><td>{modLabel(r.moduleId)}</td><td>{r.enabled ? <span className="pill ok">enabled</span> : <span className="pill deny">disabled</span>}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>

      {canReview && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>UC-FMG-05 · Review module-change requests</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Request</th><th>Change</th><th>Status</th><th>Review</th></tr></thead>
              <tbody>{mcr.map((r) => (
                <tr key={r.id}>
                  <td><code>{r.id}</code></td>
                  <td>{facLabel(r.facilityId)} · {modLabel(r.moduleId)} → {r.desiredEnabled ? "enable" : "disable"}</td>
                  <td><span className="pill">{r.status}</span></td>
                  <td><div className="row">
                    <button className="secondary" onClick={() => decide(r.id, "Approve")}>Approve</button>
                    <button className="secondary" onClick={() => decide(r.id, "Reject")}>Reject</button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
