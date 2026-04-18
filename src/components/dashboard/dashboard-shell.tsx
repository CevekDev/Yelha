'use client';
import { useState, useEffect, useCallback } from 'react';
import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from './sidebar';
import { DashboardNavbar } from './navbar';
import { X, LayoutDashboard, MessageSquare, Settings2, Package, ShoppingCart } from 'lucide-react';

const ORANGE = '#FF6B2C';

type DashTheme = 'dark' | 'light' | 'colorful';

export function DashboardShell({ children, planLevel = 'FREE' }: { children: React.ReactNode; planLevel?: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashTheme, setDashThemeState] = useState<DashTheme>('dark');
  const pathname = usePathname();
  const params = useParams();
  const locale = params.locale as string;

  // Load persisted theme
  useEffect(() => {
    const saved = localStorage.getItem('dash-theme') as DashTheme | null;
    if (saved && ['dark', 'light', 'colorful'].includes(saved)) {
      setDashThemeState(saved);
    }
  }, []);

  const setDashTheme = useCallback((t: DashTheme) => {
    setDashThemeState(t);
    localStorage.setItem('dash-theme', t);
  }, []);

  const cycleTheme = useCallback(() => {
    setDashTheme(
      dashTheme === 'dark' ? 'light' : dashTheme === 'light' ? 'colorful' : 'dark'
    );
  }, [dashTheme, setDashTheme]);

  const bottomNavItems = [
    { href: `/${locale}/dashboard`, label: 'Home', icon: LayoutDashboard, exact: true },
    { href: `/${locale}/dashboard/conversations`, label: 'Messages', icon: MessageSquare },
    { href: `/${locale}/dashboard/orders`, label: 'Commandes', icon: ShoppingCart },
    { href: `/${locale}/dashboard/products`, label: 'Produits', icon: Package },
    { href: `/${locale}/dashboard/bot-settings`, label: 'Bot', icon: Settings2 },
  ];

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div
      className="flex h-screen overflow-hidden transition-colors duration-300"
      data-dash-theme={dashTheme}
      style={{ background: 'var(--dt-bg)' }}
    >
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar planLevel={planLevel} dashTheme={dashTheme} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full z-50 flex">
            <Sidebar planLevel={planLevel} dashTheme={dashTheme} onClose={() => setSidebarOpen(false)} />
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-[-44px] w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <DashboardNavbar
          onMenuClick={() => setSidebarOpen(true)}
          dashTheme={dashTheme}
          onCycleTheme={cycleTheme}
        />
        <main className="dash-main flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 h-16 border-t transition-colors duration-300"
        style={{ background: 'var(--dt-surface)', borderColor: 'var(--dt-border)' }}
      >
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-xl transition-all"
            >
              <Icon className="w-5 h-5" style={{ color: isActive ? ORANGE : 'var(--dt-text-30)' }} />
              <span
                className="font-mono text-[9px] font-medium"
                style={{ color: isActive ? ORANGE : 'var(--dt-text-30)' }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
