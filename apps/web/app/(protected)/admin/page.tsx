import Link from "next/link";
import { ShieldCheck, Users, Building2, UserCog, Bot, Cpu, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/primitives";
import { orgUsers, organizations, roles, models } from "@/lib/demo-data";

const cards = [
  { href: "/admin/users", icon: Users, title: "Users", desc: `${orgUsers.length} members · role management`, tone: "text-teal" },
  { href: "/admin/organizations", icon: Building2, title: "Organizations", desc: `${organizations.length} tenants`, tone: "text-purple" },
  { href: "/admin/roles", icon: UserCog, title: "Roles", desc: `${roles.length} defined roles with permissions`, tone: "text-warn" },
  { href: "/admin/models", icon: Bot, title: "Models", desc: `${models.length} registry entries`, tone: "text-neon" },
  { href: "/admin/system", icon: Cpu, title: "System", desc: "Service health and diagnostics", tone: "text-orange" },
];

export default function AdminPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        crumb="Admin"
        title="Admin Panel"
        subtitle="Organization, user, role, model, and system administration."
      />

      <Card className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-xl border border-line bg-elev p-5 transition-colors hover:border-teal/40"
          >
            <div className="flex items-start justify-between">
              <div className={`grid size-10 place-items-center rounded-xl bg-card ${c.tone}`}>
                <c.icon className="size-5" />
              </div>
              <ChevronRight className="size-4 text-text-disabled transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-4 text-[15px] font-semibold">{c.title}</p>
            <p className="mt-0.5 text-[12px] text-text-secondary">{c.desc}</p>
          </Link>
        ))}
      </Card>

      <Card className="flex items-start gap-3 border-teal/30 bg-teal/10 p-4">
        <ShieldCheck className="size-5 shrink-0 text-teal" />
        <p className="text-[12px] leading-relaxed text-text-secondary">
          Role checks exist in both UI navigation and backend policy. Hiding a button is not
          authorization — RLS and server-side role checks remain mandatory.
        </p>
      </Card>
    </div>
  );
}