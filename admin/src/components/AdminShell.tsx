'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ExternalLink, LogOut, Package, Receipt, TicketPercent } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { PageSpinner } from '@/components/ui/Spinner';
import { STORE_URL } from '@/lib/utils';

const NAV = [
  { href: '/products', label: 'Products', icon: Package },
  { href: '/orders', label: 'Orders', icon: Receipt },
  { href: '/coupons', label: 'Coupons', icon: TicketPercent },
];

function Logo() {
  return (
    <Link href="/products" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-ink text-[13px] font-semibold tracking-tight text-canvas">TX</span>
      <span className="text-[15px] font-semibold tracking-tight">
        TechXStudio <span className="font-normal text-ink-3">Admin</span>
      </span>
    </Link>
  );
}

/**
 * Sidebar layout for signed-in admins. Sends everyone else to /login.
 * This only guards the UI — the API checks the admin role on every request.
 */
export default function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const onLogin = pathname === '/login';

  useEffect(() => {
    if (loading) return;
    if (!user && !onLogin) router.replace('/login');
    if (user && onLogin) router.replace('/products');
  }, [loading, user, onLogin, router]);

  if (onLogin) return <>{children}</>;
  if (loading || !user) return <PageSpinner />;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="border-b border-hairline bg-canvas-alt md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4 md:py-6">
          <Logo />
          <div className="md:hidden">
            <ThemeToggle />
          </div>
        </div>

        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? 'page' : undefined}
              className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] text-ink-2 transition-colors hover:bg-fill hover:text-ink
                aria-[current=page]:bg-card aria-[current=page]:font-medium aria-[current=page]:text-ink aria-[current=page]:shadow-card"
            >
              <Icon className="h-[17px] w-[17px]" strokeWidth={1.75} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto hidden space-y-1 border-t border-hairline px-3 py-4 md:block">
          <a href={STORE_URL} target="_blank" rel="noreferrer"
            className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] text-ink-2 transition-colors hover:bg-fill hover:text-ink">
            <ExternalLink className="h-[17px] w-[17px]" strokeWidth={1.75} />
            Open store
          </a>
          <div className="flex items-center gap-2 px-3 pt-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{user.full_name || 'Admin'}</p>
              <p className="truncate text-[12px] text-ink-3">{user.email}</p>
            </div>
            <ThemeToggle />
            <button onClick={logout} className="icon-btn icon-btn-danger" aria-label="Sign out" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-6 md:px-10 md:py-10">
        <div className="mx-auto max-w-[1200px]">{children}</div>
        <button onClick={logout} className="mx-auto mt-10 flex items-center gap-2 text-[14px] text-danger md:hidden">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </main>
    </div>
  );
}
