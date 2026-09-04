"use client";

import { useSession, signOut } from "next-auth/react";

export default function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === "loading") return <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>Loading…</span>;
  if (!session) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
      <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        {session.user?.name ?? session.user?.email}
      </span>
      <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn btn-ghost btn-sm">
        Sign Out
      </button>
    </div>
  );
}
