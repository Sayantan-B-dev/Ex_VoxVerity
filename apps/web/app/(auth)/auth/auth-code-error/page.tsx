"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Hexagon, AlertTriangle, ArrowRight } from "lucide-react";

export default function AuthCodeErrorPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          router.push("/login");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div className="relative grid h-full place-items-center bg-black px-4 py-10 text-text-primary">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(50% 50% at 50% 25%, rgba(53,214,193,0.12), transparent 70%)" }}
      />
      <div className="relative w-full max-w-[400px] animate-fade-in">
        <div className="rounded-3xl border border-line bg-card p-7 text-center">
          <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl border border-critical/30 bg-critical/10">
            <AlertTriangle className="size-7 text-critical" />
          </div>

          <h1 className="text-[22px] font-bold tracking-tight">Authentication Error</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
            There was a problem with the authentication code. This usually happens when:
          </p>
          <ul className="mx-auto mt-3 max-w-xs space-y-1 text-left text-[12px] text-text-secondary">
            <li>• The sign-in link expired or was already used</li>
            <li>• The OAuth provider returned an error</li>
            <li>• Your browser blocked the redirect</li>
          </ul>

          <button
            onClick={() => router.push("/login")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal px-5 py-2.5 text-[14px] font-semibold text-black transition-transform hover:scale-[1.02]"
          >
            Try again <ArrowRight className="size-4" />
          </button>

          <p className="mt-3 text-[11px] text-text-disabled">
            Redirecting in {countdown}s…
          </p>
        </div>
      </div>
    </div>
  );
}
