"use client";

// Shown when an actor navigates directly to a console outside their role.
export default function NotAuthorized() {
  return (
    <main>
      <div className="card">
        <span className="pill deny">403 · not authorized</span>
        <h2>Console not available to your role</h2>
        <p className="muted">
          The V9 use-case model does not grant your actor access to this console. Use the
          navigation to reach the consoles assigned to your role.
        </p>
      </div>
    </main>
  );
}
