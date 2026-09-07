"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Bell, Calendar, Menu, Search } from "lucide-react";

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
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-black/80 px-4 backdrop-blur-md lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="p-1.5 text-text-secondary hover:text-text-primary lg:hidden"
        >
          <Menu className="size-5" />
        </button>
        <div className="relative hidden w-56 sm:block">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-disabled" />
          <input
            type="text"
            placeholder="Search anything... ⌘K"
            className="w-full rounded-lg border border-line bg-elev py-1.5 pl-8 pr-3 text-xs text-text-primary outline-none transition-colors placeholder:text-text-disabled focus:border-teal/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden items-center gap-1.5 text-[13px] font-medium text-purple md:flex">
          <span className="size-2 rounded-full bg-purple" style={{ animation: "pulse-ring 2s infinite" }} />
          At Risk
        </span>

        <div className="hidden items-center gap-2 rounded-lg border border-line bg-elev px-3 py-1 text-xs text-text-secondary md:flex">
          <Calendar className="size-3.5 text-teal" />
          <span>{today}</span>
        </div>

        <button
          aria-label="Notifications"
          className="relative p-1.5 text-text-secondary transition-colors hover:text-text-primary"
        >
          <Bell className="size-4" />
          <span className="absolute right-1 top-1 size-2 rounded-full bg-critical" />
        </button>

        <Link href="/profile" className="flex items-center gap-2.5 border-l border-line pl-3">
          <div className="flex size-7 items-center justify-center rounded-full border border-teal/40 bg-teal/20 text-xs font-bold text-teal">
            {initial}
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-xs font-semibold leading-none text-text-primary">{displayName}</p>
            <p className="mt-0.5 text-[9px] text-text-secondary">Security Operations</p>
          </div>
        </Link>
      </div>
    </header>
  );
}