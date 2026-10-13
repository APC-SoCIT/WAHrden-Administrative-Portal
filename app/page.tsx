// Public landing page for the WAHrden Administration Portal.
import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";

const ACTORS = [
  {
    role: "WAH Central Administrator",
    tag: "Module 1 · 2 · 3 · 4 · 5",
    body:
      "Governs identities and account status, terminates sessions, configures roles and assigns access, reviews onboarding/access-change requests, onboards facilities, configures module availability, reviews module-change requests, and reviews operational & security information."
  },
  {
    role: "Facility Administrator",
    tag: "Module 3 · 4",
    body:
      "Submits facility-user onboarding and access-change requests, and requests module changes for their facility. Requests stay Pending until central review."
  },
  {
    role: "Participating WAH Service",
    tag: "Module 3 · 1",
    body:
      "Invokes runtime authorization (the policy decision point) on behalf of WAH services and maintains its own profile."
  }
];

export default function Home() {
  return (
    <>
      <PublicHeader />
      <div className="wrap">
        <main>
          <div className="card hero">
            <span className="pill">Cloud-hosted prototype · Vercel-ready (Next.js)</span>
            <h1>WAHrden Administration Portal</h1>
            <p>
              Centralized Identity, Access and Governance administration for the WAH
              ecosystem, aligned to the Version 9 use-case model. The portal is available
              only to the WAH Central Administrator, Facility Administrator and
              Participating WAH Service — each with a distinct set of capabilities.
            </p>
            <div className="row" style={{ marginTop: 12 }}>
              <Link href="/login"><button>Sign in to the portal</button></Link>
              <Link href="/architecture"><button className="secondary">How this maps to the architecture</button></Link>
            </div>
          </div>

          <div className="notice rule" style={{ marginTop: 16 }}>
            <strong>Access rule enforced across the portal (V9):</strong> the WAH Service User
            is <em>not</em> a portal actor and is refused at sign-in. Per-actor content and
            server-side checks are derived directly from the V9 use-case diagrams.
          </div>

          <div className="grid cols3" style={{ marginTop: 16 }}>
            {ACTORS.map((a) => (
              <div className="card" key={a.role}>
                <span className="pill">{a.tag}</span>
                <h3 style={{ marginTop: 8 }}>{a.role}</h3>
                <p className="muted">{a.body}</p>
              </div>
            ))}
          </div>

          <p className="footer">
            Prototype scope: interactive demonstration of the V9 use cases against an
            in-memory governance store. Production replaces it with PostgreSQL (Core DB +
            Audit Store) and Redis (sessions), plus a real OIDC provider — see /architecture.
          </p>
        </main>
      </div>
    </>
  );
}
