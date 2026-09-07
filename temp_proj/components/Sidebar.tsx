"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  CheckCheck,
  FlaskConical,
  Hexagon,
  LayoutDashboard,
  Link2,
  LogOut,
  Microscope,
  Phone,
  Plug,
  Radio,
  ScanSearch,
  User,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";

const nav: { section: string; items: { href: string; label: string; icon: typeof Bell }[] }[] = [
  {
    section: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/live", label: "Live Monitor", icon: Radio },
      { href: "/calls", label: "Calls", icon: Phone },
      { href: "/analysis", label: "Analysis", icon: Microscope },
      { href: "/profile", label: "Profile", icon: User },
    ],
  },
  {
    section: "Security Operations",
    items: [
      { href: "/alerts", label: "Alerts", icon: Bell },
      { href: "/incidents", label: "Incidents", icon: ScanSearch },
      { href: "/verification", label: "Verification", icon: CheckCheck },
      { href: "/lab", label: "Analysis Lab", icon: FlaskConical },
    ],
  },
  {
    section: "Intelligence",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/blockchain", label: "Evidence", icon: Link2 },
      { href: "/audit", label: "Audit", icon: ScrollText },
      { href: "/threat-intelligence", label: "Threats", icon: ShieldAlert },
    ],
  },
  {
    section: "Configuration",
    items: [
      { href: "/integrations", label: "Integrations", icon: Plug },
      { href: "/models", label: "Models", icon: Bot },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    section: "Admin",
    items: [{ href: "/admin", label: "Admin Panel", icon: ShieldCheck }],
  },
];

export default function Sidebar({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-60 flex-col justify-between border-r border-line bg-surface transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 border-b border-line p-5">
            <div className="rounded-xl border border-teal/30 bg-teal/10 p-2 text-teal">
              <Hexagon className="size-5 fill-teal/20" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-[15px] font-bold tracking-wider text-white">VOXVERITY</h1>
              <p className="-mt-0.5 text-[10px] text-text-secondary">Voice Integrity</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close menu"
              className="ml-auto text-text-secondary hover:text-text-primary lg:hidden"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-2 space-y-4 overflow-y-auto p-3">
            {nav.map((group) => (
              <div key={group.section}>
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-disabled">
                  {group.section}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-all ${
                          active
                            ? "border-teal/30 bg-teal/15 text-teal"
                            : "border-transparent text-text-secondary hover:bg-hover hover:text-text-primary"
                        }`}
                      >
                        <Icon className="size-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="space-y-3 border-t border-line p-3">
          <button className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-xs text-text-secondary transition-all hover:bg-critical/10 hover:text-critical">
            <LogOut className="size-4" /> Logout
          </button>

          <div className="flex items-center gap-2.5 rounded-xl border border-line bg-elev p-3">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-neon" />
            </span>
            <div>
              <p className="flex items-center gap-1 text-[11px] font-medium text-text-primary">
                System Status <Activity className="size-3 text-text-disabled" />
              </p>
              <p className="text-[9px] text-text-secondary">All systems operational</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}