"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Calendar, Menu } from "lucide-react";

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { data: session } = useSession();
  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const displayName = session?.user?.name ?? session?.user?.email ?? "User";
  const initial = (displayName[0] ?? "U").toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-black/80 px-5 backdrop-blur-md lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="p-1.5 text-text-secondary hover:text-text-primary lg:hidden"
        >
          <Menu className="size-5" />
        </button>
      </div>

      <div className="flex min-w-0 items-center gap-5">
        <div className="hidden shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-line bg-elev px-3.5 py-1.5 text-xs text-text-secondary lg:flex">
          <Calendar className="size-3.5 shrink-0 text-teal" />
          <span>{today}</span>
        </div>

        <Link href="/profile" className="flex min-w-0 shrink-0 items-center gap-3 border-l border-line pl-5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-teal/40 bg-teal/20 text-xs font-bold text-teal">
            {initial}
          </div>
          <div className="hidden min-w-0 text-left sm:block">
            <p className="max-w-36 truncate text-xs font-semibold leading-none text-text-primary">{displayName}</p>
            <p className="mt-1 whitespace-nowrap text-[9px] text-text-secondary">Security Operations</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
