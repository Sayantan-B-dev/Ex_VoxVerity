import type { ReactNode } from "react";

export default function PageHeader({
  crumb,
  title,
  subtitle,
  actions,
}: {
  crumb?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        {crumb && <p className="mb-0.5 text-[11px] text-text-disabled">&lt; Dashboard &gt; {crumb}</p>}
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary sm:text-[26px]">{title}</h1>
        {subtitle && <p className="text-[13px] text-text-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}