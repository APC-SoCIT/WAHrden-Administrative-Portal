"use client";
// Administration-portal sign-in gate.
// Only WAH Central Administrator, Facility Administrator and Participating WAH
// Service may enter; WAH Service User accounts are refused server-side.
import { useRouter } from "next/navigation";
import { useState } from "react";
import PublicHeader from "@/components/PublicHeader";
import { api } from "@/lib/client";
import { setSession, type PortalSession } from "@/lib/session";

const DEMO = [
  { label: "WAH Central Administrator", email: "maria.santos@wah.example" },
  { label: "Facility Administrator", email: "jose.reyes@manilahc.example" },
  { label: "Participating WAH Service", email: "service.wah4pc@services.wah.example" },
  { label: "WAH Service User (denied)", email: "ana.lim@manilahc.example" }
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("maria.santos@wah.example");
  const [password, setPassword] = useState("Wahrden!2026");
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
            <span className="pill">Demo accounts</span>
            <h2>Prototype credentials</h2>
            <p className="muted">
              All demo accounts share the password <code>Wahrden!2026</code>. Each actor
              sees a different portal; the WAH Service User is not permitted here.
            </p>
            <table>
              <thead>
                <tr><th>Actor</th><th>Email</th></tr>
              </thead>
              <tbody>
                {DEMO.map((d) => (
                  <tr key={d.email}>
                    <td>{d.label}</td>
                    <td>
                      <button
                        className="secondary"
                        style={{ padding: "4px 8px" }}
                        onClick={() => {
                          setEmail(d.email);
                          setPassword("Wahrden!2026");
                        }}
                      >
                        <code>{d.email}</code>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="notice rule">
              WAH Service User is intentionally excluded from this portal (V9). Accounts
              such as <code>ana.lim@manilahc.example</code> are refused at sign-in.
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
