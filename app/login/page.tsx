"use client";
// Administration-portal sign-in gate.
// Only WAH Central Administrator, Facility Administrator and Participating WAH
// Service may enter; WAH Service User accounts are refused server-side.
// Credentials are read from the local SQLite store — this page holds none.
import { useRouter } from "next/navigation";
import { useState } from "react";
import PublicHeader from "@/components/PublicHeader";
import { api } from "@/lib/client";
import { setSession, type PortalSession } from "@/lib/session";

const ROLES = [
  "WAH Central Administrator",
  "Facility Administrator",
  "Participating WAH Service"
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const d = await api<{ session: PortalSession }>("/api/portal/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setSession(d.session);
      router.replace("/admin");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PublicHeader />
      <div className="wrap">
        <main className="grid cols2">
          <div className="card">
            <span className="pill">Administration portal · sign in</span>
            <h2>WAHrden Administration Portal</h2>
            <p className="muted">
              This portal governs identities, access, facilities, modules and oversight for
              the WAH ecosystem. Access is limited to authorized administrator and
              participating-service accounts.
            </p>
            <form onSubmit={submit}>
              <label>Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button type="submit" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
            {err && (
              <div className="notice" style={{ borderColor: "var(--deny)", background: "var(--denybg)" }}>
                <strong style={{ color: "var(--deny)" }}>{err}</strong>
              </div>
            )}
          </div>
          <div className="card">
            <span className="pill">Prototype · presentation</span>
            <h2>Accounts</h2>
            <p className="muted">
              Demo accounts and their passwords are stored in the local SQLite database
              (<code>data/wahrden.sqlite</code>) and provided to the presenter separately.
              No credentials live in this codebase.
            </p>
            <table>
              <thead>
                <tr><th>Portal actor</th></tr>
              </thead>
              <tbody>
                {ROLES.map((r) => (
                  <tr key={r}><td>{r}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="notice rule">
              WAH Service User is intentionally excluded from this portal (V9): those
              accounts are refused at sign-in.
            </div>
          </div>
        </main>
      </div>
    </>
  );
}