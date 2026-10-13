"use client";
// Module 3 (AGA) — one console, per-actor sections:
//   WAH Central Administrator: UC-AGA-01 (roles), UC-AGA-02 (assignment),
//                              UC-AGA-04 (review onboarding), UC-AGA-06 (review access change)
//   Facility Administrator:    UC-AGA-03 (request onboarding), UC-AGA-05 (request access change)
import { useEffect, useMemo, useState } from "react";
import { useActor } from "@/components/actor-context";
import NotAuthorized from "@/components/NotAuthorized";
import { api } from "@/lib/client";
import { ALL_PERMISSIONS, PERMISSION_CATALOG } from "@/lib/permissions";

interface Role { id: string; name: string; permissions: string[] }
interface Req { id: string; status: string; facilityId: string; requestedBy: string; [k: string]: unknown }
interface Facility { id: string; code: string; name: string }
interface UserLite { id: string; displayName: string; email: string }
interface ModuleLite { id: string; code: string; name: string }

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
  const [modules, setModules] = useState<ModuleLite[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [targetUsers, setTargetUsers] = useState<UserLite[]>([]);
  const [msg, setMsg] = useState("");

  // UC-AGA-01 — role configuration (checkbox permissions; item 18)
  const [roleName, setRoleName] = useState("");
  const [rolePerms, setRolePerms] = useState<string[]>(["consultation.read", "vitals.write"]);
  const [wildcard, setWildcard] = useState(false);

  // UC-AGA-02 — assignment (user search + multi-select bulk; items 4 & 5)
  const [aUsers, setAUsers] = useState<string[]>([]);
  const [aUserQuery, setAUserQuery] = useState("");
  const [aFac, setAFac] = useState("");
  const [aRole, setARole] = useState("");
  const [aRoleQuery, setARoleQuery] = useState("");

  // UC-AGA-03 — onboarding request
  const [oFac, setOFac] = useState("");
  const [oName, setOName] = useState("Dr. Paolo Aquino");
  const [oEmail, setOEmail] = useState("paolo.aquino@manilahc.example");
  const [oRole, setORole] = useState("");
  const [oRoleQuery, setORoleQuery] = useState("");
  const [oModules, setOModules] = useState<string[]>([]);
  const [oReason, setOReason] = useState("");

  // UC-AGA-05 — access change request
  const [cFac, setCFac] = useState("");
  const [cTarget, setCTarget] = useState("");
  const [cKind, setCKind] = useState("GRANT");
  const [cRole, setCRole] = useState("");
  const [cReason, setCReason] = useState("");

  // UC-AGA-04 — reviewer comment per request (item 8)
  const [comments, setComments] = useState<Record<string, string>>({});

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
      jobs.push(api<{ facilities: Facility[]; modules: ModuleLite[] }>("/api/governance/facilities").then((d) => {
        setFacilities(d.facilities);
        setModules(d.modules ?? []);
      }).catch(() => {}));
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
  const roleLabel = (id?: unknown) => roles.find((r) => r.id === id)?.name ?? String(id ?? "—");
  const moduleLabel = (id: string) => modules.find((m) => m.id === id)?.name ?? id;
  const myOnboarding = canRequestOnboarding && !canReviewOnboarding
    ? obr.filter((r) => r.requestedBy === actor.userId)
    : obr;
  const myChange = canRequestChange && !canReviewChange
    ? acr.filter((r) => r.requestedBy === actor.userId)
    : acr;

  const filteredUsers = useMemo(
    () => users.filter((u) => `${u.displayName} ${u.email}`.toLowerCase().includes(aUserQuery.toLowerCase())),
    [users, aUserQuery]
  );
  const filteredAssignRoles = useMemo(
    () => roles.filter((r) => r.name.toLowerCase().includes(aRoleQuery.toLowerCase())),
    [roles, aRoleQuery]
  );
  const filteredOnboardRoles = useMemo(
    () => roles.filter((r) => r.name.toLowerCase().includes(oRoleQuery.toLowerCase())),
    [roles, oRoleQuery]
  );

  function togglePerm(perm: string) {
    setRolePerms((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]);
  }
  function toggleUser(id: string) {
    setAUsers((prev) => prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]);
  }
  function toggleOModule(id: string) {
    setOModules((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  }

  async function createRole(e: React.FormEvent) {
    e.preventDefault();
    const permissions = wildcard ? ["*"] : rolePerms;
    if (!roleName || permissions.length === 0) { setMsg("Error: role name and at least one permission are required."); return; }
    try {
      await api("/api/governance/roles", { method: "POST", body: JSON.stringify({ name: roleName, permissions }) });
      setMsg("UC-AGA-01: role configured."); setRoleName(""); load();
    } catch (e2) { setMsg("Error: " + (e2 instanceof Error ? e2.message : "failed")); }
  }

  async function assignAccess(e: React.FormEvent) {
    e.preventDefault();
    try {
      const d = await api<{ mode: string; applied?: number; failed?: { userId: string }[] }>("/api/governance/access-assignments", {
        method: "POST",
        body: JSON.stringify({ userIds: aUsers, facilityId: aFac, roleId: aRole })
      });
      const failed = d.failed?.length ? ` (${d.failed.length} failed)` : "";
      setMsg(`UC-AGA-02: ${d.mode}${failed}.`);
      setAUsers([]); load();
    } catch (e2) { setMsg("Error: " + (e2 instanceof Error ? e2.message : "failed")); }
  }

  async function submitOnboarding(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/governance/onboarding-requests", {
        method: "POST",
        body: JSON.stringify({
          facilityId: oFac, requestedBy: actor.userId, prospectiveName: oName,
          prospectiveEmail: oEmail, requestedRoleId: oRole || roles[0]?.id,
          requestedModuleIds: oModules, reason: oReason
        })
      });
      setMsg("UC-AGA-03: onboarding request → Pending. No account created."); setOModules([]); setOReason(""); load();
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
    const comment = comments[id] ?? "";
    if (decision !== "Approve" && !comment.trim()) {
      setMsg("Error: a comment is required to Reject or Modify-and-Approve (visible reason).");
      return;
    }
    try {
      await api(`/api/governance/onboarding-requests/${id}/decision`, {
        method: "POST", body: JSON.stringify({ decision, comment })
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
                <label>Permissions</label>
                <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="checkbox" checked={wildcard} onChange={(e) => setWildcard(e.target.checked)} />
                  Full access (<code>*</code>) — all permissions
                </label>
                <div className="perm-grid" aria-disabled={wildcard}>
                  {PERMISSION_CATALOG.map((g) => (
                    <div key={g.group} className="perm-group">
                      <div className="muted">{g.group}</div>
                      {g.permissions.map((p) => (
                        <label key={p.value} className="perm-item">
                          <input
                            type="checkbox"
                            disabled={wildcard}
                            checked={rolePerms.includes(p.value)}
                            onChange={() => togglePerm(p.value)}
                          />
                          {p.label} <span className="muted"><code>{p.value}</code></span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
                <p className="muted">{wildcard ? "Full access" : `${rolePerms.length} of ${ALL_PERMISSIONS.length} permissions selected`}</p>
                <button type="submit">Configure role</button>
              </form>
            </div>
          )}
          {canAssign && (
            <div className="card">
              <h3>UC-AGA-02 · Facility-scoped assignment</h3>
              <p className="muted">{assignments.length} existing assignment(s). Select one or more users to bulk-assign them into the same facility.</p>
              <form onSubmit={assignAccess}>
                <label>Search user (name or email)</label>
                <input value={aUserQuery} onChange={(e) => setAUserQuery(e.target.value)} placeholder="Search by username or email…" />
                <div className="pick-list">
                  {filteredUsers.length === 0 && <span className="muted">No matching users.</span>}
                  {filteredUsers.map((u) => (
                    <label key={u.id} className="perm-item">
                      <input type="checkbox" checked={aUsers.includes(u.id)} onChange={() => toggleUser(u.id)} />
                      {u.displayName} <span className="muted">{u.email}</span>
                    </label>
                  ))}
                </div>
                <p className="muted">{aUsers.length} user(s) selected</p>
                <label>Facility</label>
                <select value={aFac} onChange={(e) => setAFac(e.target.value)}>
                  <option value="">Select facility…</option>
                  {facilities.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.code})</option>)}
                </select>
                <label>Search role</label>
                <input value={aRoleQuery} onChange={(e) => setARoleQuery(e.target.value)} placeholder="Filter roles…" />
                <select value={aRole} onChange={(e) => setARole(e.target.value)}>
                  <option value="">Select role…</option>
                  {filteredAssignRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button type="submit" disabled={aUsers.length === 0 || !aFac || !aRole}>
                  Assign access {aUsers.length > 1 ? `(bulk ${aUsers.length})` : ""}
                </button>
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
              <label>Search role</label>
              <input value={oRoleQuery} onChange={(e) => setORoleQuery(e.target.value)} placeholder="Filter roles…" />
              <select value={oRole} onChange={(e) => setORole(e.target.value)}>
                <option value="">Select role…</option>
                {filteredOnboardRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <label>Requested modules</label>
              <div className="pick-list">
                {modules.map((m) => (
                  <label key={m.id} className="perm-item">
                    <input type="checkbox" checked={oModules.includes(m.id)} onChange={() => toggleOModule(m.id)} />
                    {m.name} <span className="muted">{m.code}</span>
                  </label>
                ))}
              </div>
              <label>Reason</label>
              <input value={oReason} onChange={(e) => setOReason(e.target.value)} placeholder="Justification for onboarding" />
              <button type="submit">Submit onboarding request</button>
            </form>
          )}
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Request</th><th>Facility</th><th>Requested role</th><th>Requested modules</th>
                <th>Status</th>{canReviewOnboarding && <th>Review</th>}
              </tr>
            </thead>
            <tbody>{myOnboarding.map((r) => (
              <tr key={r.id}>
                <td><code>{r.id}</code><br /><span className="muted">{String(r.prospectiveName)} · {String(r.prospectiveEmail)}</span>
                  {!!r.reason && <div className="muted">Reason: {String(r.reason)}</div>}
                  {!!r.reviewComment && <div className="muted">Review: {String(r.reviewComment)}</div>}
                </td>
                <td>{facLabel(r.facilityId)}</td>
                <td>{roleLabel(r.requestedRoleId)}</td>
                <td>
                  {Array.isArray(r.requestedModuleIds) && r.requestedModuleIds.length
                    ? <span className="muted">{(r.requestedModuleIds as string[]).map(moduleLabel).join(", ")}</span>
                    : <span className="muted">—</span>}
                </td>
                <td><span className="pill">{r.status}</span></td>
                {canReviewOnboarding && (
                  <td>
                    <input
                      placeholder="Comment (required for Reject / Modify)"
                      value={comments[r.id] ?? ""}
                      onChange={(e) => setComments((c) => ({ ...c, [r.id]: e.target.value }))}
                    />
                    <div className="row" style={{ marginTop: 4 }}>
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
