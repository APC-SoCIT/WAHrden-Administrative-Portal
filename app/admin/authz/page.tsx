"use client";
// Module 3 (RTA) — UC-AGA-07 Authorizing Service Access.
// The Participating WAH Service invokes the policy decision point at runtime;
// the decision is fail-closed and always written to the Internal Audit Store.
import { useState } from "react";
import { useActor } from "@/components/actor-context";
import NotAuthorized from "@/components/NotAuthorized";
import { api } from "@/lib/client";

interface Eval { step: string; ok: boolean; detail: string }
interface Decision { decision: string; evaluations: Eval[]; audited: boolean; auditId?: string }

const PRESETS = [
  { label: "Doctor · consultation.read (allowed)", userId: "u-doctor-1", facilityId: "f-manila", action: "consultation.read", moduleId: "m-dialysis" },
  { label: "Doctor · billing.delete (denied)", userId: "u-doctor-1", facilityId: "f-manila", action: "billing.delete", moduleId: "" },
  { label: "Inactive account (denied)", userId: "u-nurse-1", facilityId: "f-manila", action: "consultation.read", moduleId: "" }
];

export default function AuthzPage() {
  const { actor, can } = useActor();
  const [userId, setUserId] = useState("u-doctor-1");
  const [facilityId, setFacilityId] = useState("f-manila");
  const [action, setAction] = useState("consultation.read");
  const [moduleId, setModuleId] = useState("m-dialysis");
  const [result, setResult] = useState<Decision | null>(null);
  const [err, setErr] = useState("");

  if (!can("UC-AGA-07")) return <NotAuthorized />;

  async function evaluate(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setResult(null);
    try {
      const d = await api<Decision>("/api/v1/authz/evaluate", {
        method: "POST",
        body: JSON.stringify({ userId, facilityId, action, moduleId: moduleId || undefined })
      });
      setResult(d);
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "evaluation failed"); }
  }

  return (
    <main>
      <div className="card">
        <span className="pill">Module 3 · Runtime Authorization (PDP)</span>
        <h2>Authorizing Service Access</h2>
        <p className="muted">
          Signed in as {actor.role} · UC-AGA-07. Every decision is fail-closed and
          retained in the Internal Audit Store.
        </p>
      </div>
      <div className="grid cols2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Evaluation request</h3>
          <div className="row" style={{ flexWrap: "wrap" }}>
            {PRESETS.map((p) => (
              <button key={p.label} className="secondary" style={{ padding: "4px 8px" }}
                onClick={() => { setUserId(p.userId); setFacilityId(p.facilityId); setAction(p.action); setModuleId(p.moduleId); }}>
                {p.label}
              </button>
            ))}
          </div>
          <form onSubmit={evaluate} style={{ marginTop: 8 }}>
            <label>Subject user id</label>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} />
            <label>Facility id</label>
            <input value={facilityId} onChange={(e) => setFacilityId(e.target.value)} />
            <label>Action</label>
            <input value={action} onChange={(e) => setAction(e.target.value)} />
            <label>Module id (optional)</label>
            <input value={moduleId} onChange={(e) => setModuleId(e.target.value)} />
            <button type="submit">Evaluate authorization</button>
          </form>
          {err && <p style={{ color: "var(--deny)" }}>{err}</p>}
        </div>
        <div className="card">
          <h3>Decision</h3>
          {!result ? (
            <p className="muted">Submit a request to see the policy decision and each evaluated constraint.</p>
          ) : (
            <>
              <p>
                {result.decision === "Authorized"
                  ? <span className="pill ok">Authorized</span>
                  : <span className="pill deny">Denied</span>}
                {result.auditId && <span className="muted"> · audit {result.auditId}</span>}
              </p>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Step</th><th>Result</th></tr></thead>
                  <tbody>{result.evaluations.map((ev, i) => (
                    <tr key={i}>
                      <td>{ev.step}</td>
                      <td>{ev.ok ? <span className="pill ok">ok</span> : <span className="pill deny">no</span>}
                        <br /><span className="muted">{ev.detail}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
