import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}

export default function PageHeader({ title, subtitle, actions, back }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="link mb-2 inline-flex items-center gap-0.5 text-[14px]">
            <ChevronLeft className="-ml-1 h-4 w-4" /> {back.label}
          </Link>
        )}
        <h1 className="t-title">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** Centered message for empty lists and load errors. */
export function StateMessage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card px-6 py-16 text-center">
      <p className="text-[17px] font-semibold">{title}</p>
      {children && <div className="mt-2 text-[14px] text-ink-2">{children}</div>}
    </div>
  );
}
