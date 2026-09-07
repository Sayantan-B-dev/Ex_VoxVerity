"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { ConfirmDialog } from "@/components/primitives";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [confirming, setConfirming] = useState(false);
  const signedIn = status === "authenticated" && !!session?.user;

  return (
    <div className="min-h-full bg-black text-text-primary">
      <header className="sticky top-0 z-20 border-b border-line/60 bg-black/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/brand/voxverity/voxverity-symbol.png"
              alt="VoxVerity logo"
              width={24}
              height={24}
              className="size-6 object-contain"
            />
            <span className="text-[16px] font-bold tracking-tight">VOXVERITY</span>
          </Link>
          <nav className="flex items-center gap-6 text-[13px] text-text-secondary">
            <Link href="/help" className="transition-colors hover:text-text-primary">
              Help
            </Link>
            <Link href="/status" className="transition-colors hover:text-text-primary">
              Status
            </Link>
            {signedIn ? (
              <button
                onClick={() => setConfirming(true)}
                className="rounded-lg border border-line px-4 py-2 font-medium transition-colors hover:border-critical/50 hover:text-critical"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-lg border border-line px-4 py-2 font-medium transition-colors hover:border-teal/50 hover:text-teal"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-6 py-10">{children}</main>

      <ConfirmDialog
        open={confirming}
        title="Sign out?"
        body="You will be signed out of VoxVerity on this browser."
        confirmLabel="Sign out"
        onCancel={() => setConfirming(false)}
        onConfirm={() => signOut({ callbackUrl: "/login" })}
      />
    </div>
  );
}
