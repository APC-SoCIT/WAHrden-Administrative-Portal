"use client";
// Module 3 (AGA) — one console, per-actor sections:
//   WAH Central Administrator: UC-AGA-01 (roles), UC-AGA-02 (assignment),
//                              UC-AGA-04 (review onboarding), UC-AGA-06 (review access change)
//   Facility Administrator:    UC-AGA-03 (request onboarding), UC-AGA-05 (request access change)
import { useEffect, useState } from "react";
import { useActor } from "@/components/actor-context";
import NotAuthorized from "@/components/NotAuthorized";
import { api } from "@/lib/client";

interface Role { id: string; name: string; permissions: string[] }
interface Req { id: string; status: string; facilityId: string; requestedBy: string; [k: string]: unknown }
interface Facility { id: string; code: string; name: string }
interface UserLite { id: string; displayName: string; email: string }

export default function AccessPage() {
  const { actor, can } = useActor();

  const canRoles = can("UC-AGA-01");
  const canAssign = can("UC-AGA-02");
  const canRequestOnboarding = can("UC-AGA-03");
  const canReviewOnboarding = can("UC-AGA-04");
  const canRequestChange = can("UC-AGA-05");
  const canReviewChange = can("UC-AGA-06");

  const [roles, setRoles] = useState<Role[]>([]);
  const [assignments, setAssignments] = useState<unknown[]>([]);
  const [obr, setObr] = useState<Req[]>([]);
  const [acr, setAcr] = useState<Req[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [targetUsers, setTargetUsers] = useState<UserLite[]>([]);
  const [msg, setMsg] = useState("");

  const [roleName, setRoleName] = useState("");
  const [rolePerms, setRolePerms] = useState("consultation.read, vitals.write");
  const [aUser, setAUser] = useState("");
  const [aFac, setAFac] = useState("");
  const [aRole, setARole] = useState("");
  const [oFac, setOFac] = useState("");
  const [oName, setOName] = useState("Dr. Paolo Aquino");
  const [oEmail, setOEmail] = useState("paolo.aquino@manilahc.example");
  const [cFac, setCFac] = useState("");
  const [cTarget, setCTarget] = useState("");
  const [cKind, setCKind] = useState("GRANT");
  const [cRole, setCRole] = useState("");
  const [cReason, setCReason] = useState("");

  async function load() {
    const jobs: Promise<unknown>[] = [];
    if (canRoles || canAssign || canRequestOnboarding || canRequestChange) {
      jobs.push(api<{ roles: Role[] }>("/api/governance/roles").then((d) => setRoles(d.roles)).catch(() => {}));
    }
    if (canAssign) {
      jobs.push(api<{ assignments: unknown[] }>("/api/governance/access-assignments").then((d) => setAssignments(d.assignments)).catch(() => {}));
      jobs.push(api<{ users: UserLite[] }>("/api/governance/users").then((d) => setUsers(d.users)).catch(() => {}));
    }
    if (canAssign || canRequestOnboarding || canRequestChange) {
      jobs.push(api<{ facilities: Facility[] }>("/api/governance/facilities").then((d) => setFacilities(d.facilities)).catch(() => {}));
    }
    if (canRequestOnboarding || canReviewOnboarding) {
      jobs.push(api<{ requests: Req[] }>("/api/governance/onboarding-requests").then((d) => setObr(d.requests)).catch(() => {}));
    }
    if (canRequestChange || canReviewChange) {
      jobs.push(api<{ requests: Req[] }>("/api/governance/access-change-requests").then((d) => setAcr(d.requests)).catch(() => {}));
    }
    if (canRequestChange) {
      jobs.push(api<{ users: UserLite[] }>("/api/portal/facility-users").then((d) => setTargetUsers(d.users)).catch(() => {}));
    }
    await Promise.all(jobs);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!canRoles && !canAssign && !canRequestOnboarding && !canReviewOnboarding && !canRequestChange && !canReviewChange) {
    return <NotAuthorized />;
  }

  const facLabel = (id: string) => facilities.find((f) => f.id === id)?.name ?? id;
  const myOnboarding = canRequestOnboarding && !canReviewOnboarding
    ? obr.filter((r) => r.requestedBy === actor.userId)
    : obr;
  const myChange = canRequestChange && !canReviewChange
    ? acr.filter((r) => r.requestedBy === actor.userId)
    : acr;

  async function createRole(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/governance/roles", {
        method: "POST",
        body: JSON.stringify({ name: roleName, permissions: rolePerms.split(",").map((s) => s.trim()).filter(Boolean) })
      });
      setMsg("UC-AGA-01: role configured."); setRoleName(""); load();
    } catch (e2) { setMsg("Error: " + (e2 instanceof Error ? e2.message : "failed")); }
  }

  async function assignAccess(e: React.FormEvent) {
    e.preventDefault();
    try {
      const d = await api<{ mode: string }>("/api/governance/access-assignments", {
        method: "POST",
        body: JSON.stringify({ userId: aUser, facilityId: aFac, roleId: aRole })
      });
      setMsg(`UC-AGA-02: access ${d.mode}.`); load();
    } catch (e2) { setMsg("Error: " + (e2 instanceof Error ? e2.message : "failed")); }
  }

  async function submitOnboarding(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/governance/onboarding-requests", {
        method: "POST",
        body: JSON.stringify({
          facilityId: oFac, requestedBy: actor.userId, prospectiveName: oName,
          prospectiveEmail: oEmail, requestedRoleId: aRole || roles[0]?.id
        })
      });
      setMsg("UC-AGA-03: onboarding request → Pending. No account created."); load();
    } catch (e2) { setMsg("Error: " + (e2 instanceof Error ? e2.message : "failed")); }
  }

  async function submitChange(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/governance/access-change-requests", {
        method: "POST",
        body: JSON.stringify({
          facilityId: cFac, requestedBy: actor.userId, targetUserId: cTarget,
          changeKind: cKind, roleId: cRole || undefined, reason: cReason
        })
      });
      setMsg("UC-AGA-05: access-change request → Pending. Existing access unchanged."); load();
    } catch (e2) { setMsg("Error: " + (e2 instanceof Error ? e2.message : "failed")); }
  }

  async function decideObr(id: string, decision: string) {
    try {
      await api(`/api/governance/onboarding-requests/${id}/decision`, {
        method: "POST", body: JSON.stringify({ decision })
      });
      setMsg(`UC-AGA-04: ${decision} recorded (governance only). Create account via Identities, assign via UC-AGA-02.`);
      load();
    } catch (e2) { setMsg("Error: " + (e2 instanceof Error ? e2.message : "failed")); }
  }

  async function decideAcr(id: string, decision: string) {
    try {
      await api(`/api/governance/access-change-requests/${id}/decision`, {
        method: "POST", body: JSON.stringify({ decision })
      });
      setMsg(`UC-AGA-06: ${decision} recorded (governance only). Apply via UC-AGA-02.`);
      load();
    } catch (e2) { setMsg("Error: " + (e2 instanceof Error ? e2.message : "failed")); }
  }

  return (
    <main>
      <div className="card">
        <span className="pill">Module 3 · Access Governance &amp; Authorization</span>
        <h2>Governing User Access &amp; Authorizing Services</h2>
        <p className="muted">Signed in as {actor.role}</p>
        {msg && <p className="muted">{msg}</p>}
      </div>

      {(canRoles || canAssign) && (
        <div className="grid cols2" style={{ marginTop: 16 }}>
          {canRoles && (
            <div className="card">
              <h3>UC-AGA-01 · Roles &amp; permissions</h3>
              <table>
                <thead><tr><th>Role</th><th>Permissions</th></tr></thead>
                <tbody>{roles.map((r) => (
                  <tr key={r.id}><td>{r.name}<br /><span className="muted">{r.id}</span></td><td><code>{r.permissions.join(", ")}</code></td></tr>
                ))}</tbody>
              </table>
              <form onSubmit={createRole} style={{ marginTop: 8 }}>
                <label>New role name</label>
                <input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="Dialysis Nurse" />
                <label>Permissions (comma-separated)</label>
                <input value={rolePerms} onChange={(e) => setRolePerms(e.target.value)} />
                <button type="submit">Configure role</button>
              </form>
            </div>
          )}
          {canAssign && (
            <div className="card">
              <h3>UC-AGA-02 · Facility-scoped assignment</h3>
              <p className="muted">{assignments.length} existing assignment(s).</p>
              <form onSubmit={assignAccess}>
                <label>User</label>
                <select value={aUser} onChange={(e) => setAUser(e.target.value)}>
                  <option value="">Select user…</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
                </select>
                <label>Facility</label>
                <select value={aFac} onChange={(e) => setAFac(e.target.value)}>
                  <option value="">Select facility…</option>
                  {facilities.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.code})</option>)}
                </select>
                <label>Role</label>
                <select value={aRole} onChange={(e) => setARole(e.target.value)}>
                  <option value="">Select role…</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button type="submit">Establish / modify access</button>
              </form>
            </div>
          )}
        </div>
      )}

      {(canRequestOnboarding || canReviewOnboarding) && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>{canReviewOnboarding ? "UC-AGA-04 · Review onboarding requests" : "UC-AGA-03 · Request facility user onboarding"}</h3>
          {canRequestOnboarding && !canReviewOnboarding && (
            <form onSubmit={submitOnboarding}>
              <label>Facility</label>
              <select value={oFac} onChange={(e) => setOFac(e.target.value)}>
                <option value="">Select facility…</option>
                {facilities.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.code})</option>)}
              </select>
              <label>Prospective name / email</label>
              <input value={oName} onChange={(e) => setOName(e.target.value)} />
              <input value={oEmail} onChange={(e) => setOEmail(e.target.value)} />
              <label>Requested role</label>
              <select value={aRole} onChange={(e) => setARole(e.target.value)}>
                <option value="">Select role…</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <button type="submit">Submit onboarding request</button>
            </form>
          )}
          <table style={{ marginTop: 8 }}>
            <thead><tr><th>Request</th><th>Facility</th><th>Status</th>{canReviewOnboarding && <th>Review</th>}</tr></thead>
            <tbody>{myOnboarding.map((r) => (
              <tr key={r.id}>
                <td><code>{r.id}</code><br /><span className="muted">{String(r.prospectiveName)} · {String(r.prospectiveEmail)}</span></td>
                <td>{facLabel(r.facilityId)}</td>
                <td><span className="pill">{r.status}</span></td>
                {canReviewOnboarding && (
                  <td>
                    <div className="row">
                      <button className="secondary" onClick={() => decideObr(r.id, "Approve")}>Approve</button>
                      <button className="secondary" onClick={() => decideObr(r.id, "ModifyAndApprove")}>Modify+Approve</button>
                      <button className="secondary" onClick={() => decideObr(r.id, "Reject")}>Reject</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {(canRequestChange || canReviewChange) && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>{canReviewChange ? "UC-AGA-06 · Review access-change requests" : "UC-AGA-05 · Request facility user access change"}</h3>
          {canRequestChange && !canReviewChange && (
            <form onSubmit={submitChange}>
              <label>Facility</label>
              <select value={cFac} onChange={(e) => setCFac(e.target.value)}>
                <option value="">Select facility…</option>
                {facilities.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.code})</option>)}
              </select>
              <label>Target user (within facility)</label>
              <select value={cTarget} onChange={(e) => setCTarget(e.target.value)}>
                <option value="">Select user…</option>
                {targetUsers.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
              </select>
              <label>Change kind</label>
              <select value={cKind} onChange={(e) => setCKind(e.target.value)}>
                <option>GRANT</option><option>MODIFY</option><option>REVOKE</option>
              </select>
              <label>Role (for GRANT/MODIFY)</label>
              <select value={cRole} onChange={(e) => setCRole(e.target.value)}>
                <option value="">n/a</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <label>Reason</label>
              <input value={cReason} onChange={(e) => setCReason(e.target.value)} />
              <button type="submit">Submit access-change request</button>
            </form>
          )}
          <table style={{ marginTop: 8 }}>
            <thead><tr><th>Request</th><th>Facility</th><th>Status</th>{canReviewChange && <th>Review</th>}</tr></thead>
            <tbody>{myChange.map((r) => (
              <tr key={r.id}>
                <td><code>{r.id}</code><br /><span className="muted">{String(r.changeKind)} · user {String(r.targetUserId)}</span></td>
                <td>{facLabel(r.facilityId)}</td>
                <td><span className="pill">{r.status}</span></td>
                {canReviewChange && (
                  <td>
                    <div className="row">
                      <button className="secondary" onClick={() => decideAcr(r.id, "Approve")}>Approve</button>
                      <button className="secondary" onClick={() => decideAcr(r.id, "Reject")}>Reject</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </main>
  );
}
