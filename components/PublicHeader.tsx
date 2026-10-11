"use client";
import Link from "next/link";

// Brand bar for public (unauthenticated) pages.
export default function PublicHeader() {
  return (
    <div className="topbar">
      <div className="brand">
        WAHrden Admin Portal <small>Identity &amp; Access Governance · prototype</small>
      </div>
      <Link href="/">Home</Link>
      <Link href="/login">Sign in</Link>
      <Link href="/architecture">Architecture</Link>
    </div>
  );
}
