'use client';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Plug, Coins, Settings, LogOut,
  Shield, BarChart3, Bot, ChevronRight, Lock,
  MessageSquare, Package, ShoppingCart, Truck, Settings2,
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import { UpgradeModal } from './upgrade-modal';

const ORANGE = '#FF6B2C';

const PLAN_RANK: Record<string, number> = { FREE: 0, STARTER: 1, BUSINESS: 2, PRO: 3, AGENCY: 4 };

type DashTheme = 'dark' | 'light' | 'colorful';

export function Sidebar({
  onClose,
  planLevel = 'FREE',
  dashTheme = 'dark',
}: {
  onClose?: () => void;
  planLevel?: string;
  dashTheme?: DashTheme;
} = {}) {
  const t = useTranslations('dashboard');
  const tNav = useTranslations('nav');
  const pathname = usePathname();
  const params = useParams();
  const locale = params.locale as string;
  const { data: session } = useSession();
  const [upgradeModal, setUpgradeModal] = useState<{ plan: string; feature: string } | null>(null);

  const canAccess = (required: string) => PLAN_RANK[planLevel] >= PLAN_RANK[required];

  const mainNavItems = [
    { href: `/${locale}/dashboard`, label: t('overview'), icon: LayoutDashboard, exact: true },
    { href: `/${locale}/dashboard/conversations`, label: t('conversations'), icon: MessageSquare },
    { href: `/${locale}/dashboard/bot-settings`, label: t('botSettings'), icon: Settings2 },
    { href: `/${locale}/dashboard/products`, label: t('products'), icon: Package },
    { href: `/${locale}/dashboard/orders`, label: t('orders'), icon: ShoppingCart },
    { href: `/${locale}/dashboard/delivery`, label: t('delivery'), icon: Truck, soon: true },
  ];

  const secondaryNavItems = [
    { href: `/${locale}/dashboard/connections`, label: t('connections'), icon: Plug, required: 'FREE' },
    { href: `/${locale}/dashboard/tokens`, label: t('tokens'), icon: Coins, required: 'FREE' },
    { href: `/${locale}/dashboard/analytics`, label: t('analytics'), icon: BarChart3, required: 'BUSINESS' },
    { href: `/${locale}/dashboard/settings`, label: t('settings'), icon: Settings, required: 'FREE' },
  ];

  if (session?.user.role === 'ADMIN') {
    secondaryNavItems.push({ href: `/${locale}/admin`, label: 'Admin', icon: Shield } as any);
  }

  const renderNavItem = (item: {
    href: string;
    label: string;
    icon: any;
    exact?: boolean;
    soon?: boolean;
    required?: string;
  }) => {
    const Icon = item.icon;
    const isActive = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + '/');
    const locked = item.required && !canAccess(item.required) && !item.soon;

    if (locked) {
      return (
        <button
          key={item.href}
          onClick={() => setUpgradeModal({ plan: item.required!, feature: item.label })}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all w-full"
          style={{ color: 'var(--dt-text-20)' }}
        >
          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--dt-text-10)' }} />
          <span className="flex-1 text-left">{item.label}</span>
          <Lock className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--dt-text-10)' }} />
        </button>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group"
        style={
          isActive
            ? { background: `${ORANGE}20`, color: ORANGE }
            : { color: 'var(--dt-text-40)' }
        }
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--dt-text-80)'; }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--dt-text-40)'; }}
      >
        <Icon className="w-4 h-4 flex-shrink-0" style={isActive ? { color: ORANGE } : {}} />
        <span className="flex-1">{item.label}</span>
        {item.soon && (
          <span
            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full leading-none"
            style={{ background: 'var(--dt-hover)', color: 'var(--dt-text-30)', border: '1px solid var(--dt-border-2)' }}
          >
            {t('soon')}
          </span>
        )}
        {isActive && !item.soon && (
          <ChevronRight className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: ORANGE }} />
        )}
      </Link>
    );
  };

  return (
    <div
      className="flex h-full w-64 flex-col transition-colors duration-300"
      style={{ background: 'var(--dt-surface)', borderRight: '1px solid var(--dt-border)' }}
    >
      {upgradeModal && (
        <UpgradeModal
          requiredPlan={upgradeModal.plan as any}
          featureName={upgradeModal.feature}
          onClose={() => setUpgradeModal(null)}
        />
      )}

      {/* Logo */}
      <div
        className="flex h-14 lg:h-16 items-center px-5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--dt-border)' }}
      >
        <Link href={`/${locale}`} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: ORANGE }}>
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-mono font-bold text-lg" style={{ color: 'var(--dt-text)' }}>YelhaDms</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <div className="space-y-0.5">{mainNavItems.map(renderNavItem)}</div>
        <div className="my-3" style={{ borderTop: '1px solid var(--dt-border)' }} />
        <div className="space-y-0.5">{secondaryNavItems.map(renderNavItem)}</div>
      </nav>

      {/* User */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid var(--dt-border)' }}>
        <div className="px-3 mb-2">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--dt-text-80)' }}>
            {session?.user.name || 'Utilisateur'}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--dt-text-30)' }}>
            {session?.user.email}
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: `/${locale}/auth/signin` })}
          className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2.5 text-sm transition-all"
          style={{ color: 'var(--dt-text-40)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--dt-text-70)'; (e.currentTarget as HTMLElement).style.background = 'var(--dt-hover)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--dt-text-40)'; (e.currentTarget as HTMLElement).style.background = ''; }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {tNav('signOut')}
        </button>
      </div>
    </div>
  );
}
