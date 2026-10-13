"use client";
import Link from "next/link";

// Brand bar for public (unauthenticated) pages.
export default function PublicHeader() {
  return (
    <div className="topbar">
      <div className="brand">
        WAHrden <small>Admin Portal · Identity &amp; Access Governance</small>
      </div>
      <nav className="topbar-nav">
        <Link href="/">Home</Link>
        <Link href="/login">Sign in</Link>
        <Link href="/architecture">Architecture</Link>
      </nav>
    </div>
  );
}
