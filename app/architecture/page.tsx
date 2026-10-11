// Prototype ↔ production-architecture mapping (C4 + Component diagrams, V9).
import PublicHeader from "@/components/PublicHeader";

export default function ArchitecturePage() {
  return (
    <>
      <PublicHeader />
      <main>
      <div className="card">
        <span className="pill">Traceability · C4 + Component + Use Cases</span>
        <h2>How the prototype maps to the approved architecture</h2>
        <p className="muted">
          Production (per diagrams) is Next.js portals + NestJS services on PostgreSQL/Redis.
          This Vercel-hosted prototype collapses the services into Next.js Route Handlers
          backed by an in-memory store with the same use-case semantics and HTTP contracts.
        </p>
      </div>
      <div className="grid cols2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Container → prototype route</h3>
          <table>
            <thead><tr><th>C4 container</th><th>Prototype</th></tr></thead>
            <tbody>
              <tr><td>SSO &amp; Access Portal (Next.js)</td><td><code>/login</code> — UC-ASS-01/02 then admin gate. V9: WSU portal flows (UC-ASS-01/02/03 user-side) are out of admin-portal scope.</td></tr>
              <tr><td>Governance Admin Web (Next.js)</td><td><code>/admin/*</code> — Modules 1–5 consoles, per-actor (V9)</td></tr>
              <tr><td>Internal Gateway (reverse proxy)</td><td>Next.js routing + <code>/api/*</code> grouping (one Vercel deployment)</td></tr>
              <tr><td>Identity &amp; Auth Service (NestJS)</td><td><code>/api/auth/*</code> + <code>lib/db.ts</code> sessions</td></tr>
              <tr><td>Governance &amp; PDP Service (NestJS)</td><td><code>/api/governance/*</code> + <code>POST /api/v1/authz/evaluate</code> + <code>lib/pdp.ts</code></td></tr>
              <tr><td>Oversight Service (NestJS)</td><td><code>/api/oversight</code> (GET review, POST report)</td></tr>
              <tr><td>Core DB (PostgreSQL) / Audit Store</td><td><code>lib/seed.ts</code> + <code>lib/db.ts</code> (swap to Vercel Postgres)</td></tr>
              <tr><td>Session &amp; Cache Store (Redis)</td><td>In-memory sessions (swap to Upstash/Vercel KV)</td></tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>Component → code</h3>
          <table>
            <thead><tr><th>Component Diagram</th><th>Prototype</th></tr></thead>
            <tbody>
              <tr><td>Governance Controller</td><td><code>app/api/governance/*/route.ts</code></td></tr>
              <tr><td>Authorization Controller (<code>POST /evaluate</code>)</td><td><code>app/api/v1/authz/evaluate/route.ts</code></td></tr>
              <tr><td>Policy Decision Engine + evaluators</td><td><code>lib/pdp.ts → evaluateAuthz()</code> (steps 2.1–2.4, fail-closed)</td></tr>
              <tr><td>Access Request Handler (UC-AGA-03→06)</td><td>onboarding / access-change route handlers</td></tr>
              <tr><td>Token &amp; Context Guard</td><td><code>lib/server-access.ts</code> → <code>resolveActor</code> gate on every handler; portal session in <code>lib/session.ts</code> (<code>/api/portal/login</code>, documented OIDC swap)</td></tr>
              <tr><td>Governance Repository (TypeORM)</td><td><code>lib/db.ts</code> typed store</td></tr>
              <tr><td>Audit Logger → Internal Audit Store</td><td><code>audit()</code> on every mutation + decision</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Production hardening checklist (out of prototype scope)</h3>
        <ul className="muted">
          <li>Replace mock auth with a real OIDC/OAuth2 provider (JWKS validation per C4: WAH4PC/WAH4Hospital/OpenHIM validate via JWKS).</li>
          <li>Move <code>lib/db.ts</code> to Vercel Postgres (Core + Audit stores) via Drizzle/Prisma; sessions to Vercel KV/Upstash Redis.</li>
          <li>Split NestJS services out of Route Handlers if load/team boundaries demand it; keep <code>POST /api/v1/authz/evaluate</code> contract stable.</li>
          <li>Add mTLS for OpenHIM/external-claims paths and rate limiting at the gateway.</li>
          <li>External Health Ecosystem (PhilHealth APIs, registries, partner HIEs) remains documentation-only in this prototype.</li>
        </ul>
      </div>
      </main>
    </>
  );
}
