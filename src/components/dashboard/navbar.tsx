'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Coins, ShoppingCart, Menu, Sun, Moon, Sparkles } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useEffect, useState } from 'react';

const ORANGE = '#FF6B2C';

type DashTheme = 'dark' | 'light' | 'colorful';

interface DashboardNavbarProps {
  onMenuClick?: () => void;
  dashTheme?: DashTheme;
  onCycleTheme?: () => void;
}

const THEME_ICON: Record<DashTheme, React.ReactNode> = {
  dark: <Moon className="w-4 h-4" />,
  light: <Sun className="w-4 h-4" />,
  colorful: <Sparkles className="w-4 h-4" />,
};

const THEME_LABEL: Record<DashTheme, string> = {
  dark: 'Sombre',
  light: 'Clair',
  colorful: 'Coloré',
};

export function DashboardNavbar({ onMenuClick, dashTheme = 'dark', onCycleTheme }: DashboardNavbarProps) {
  const params = useParams();
  const locale = params.locale as string;
  const [balance, setBalance] = useState<number | null>(null);
  const [unlimited, setUnlimited] = useState(false);

  useEffect(() => {
    fetch('/api/user/me')
      .then(r => r.json())
      .then(u => {
        setBalance(u.tokenBalance ?? 0);
        setUnlimited(u.unlimitedTokens ?? false);
      })
      .catch(() => {});
  }, []);

  return (
    <header
      className="h-14 lg:h-16 flex items-center px-4 gap-3 justify-between lg:justify-end flex-shrink-0 transition-colors duration-300"
      style={{ background: 'var(--dt-surface)', borderBottom: '1px solid var(--dt-border)' }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
        style={{ background: 'var(--dt-hover)', border: '1px solid var(--dt-border-2)', color: 'var(--dt-text-50)' }}
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Logo on mobile */}
      <div className="lg:hidden flex-1">
        <span className="font-mono font-bold text-base" style={{ color: 'var(--dt-text)' }}>
          YelhaDms<span style={{ color: ORANGE }}>.</span>
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Token balance */}
        <div
          className="flex items-center gap-1.5 lg:gap-2 rounded-xl px-2.5 lg:px-3.5 py-2"
          style={{ background: 'var(--dt-hover)', border: '1px solid var(--dt-border-2)' }}
        >
          <Coins className="w-3.5 h-3.5 lg:w-4 lg:h-4" style={{ color: ORANGE }} />
          <span className="font-mono text-xs lg:text-sm font-semibold" style={{ color: 'var(--dt-text)' }}>
            {unlimited ? '∞' : (balance !== null ? balance.toLocaleString() : '...')}
          </span>
          <span className="text-xs font-mono hidden sm:inline" style={{ color: 'var(--dt-text-30)' }}>
            tokens
          </span>
        </div>

        {/* Buy tokens */}
        <Link href={`/${locale}/dashboard/tokens`}>
          <button
            className="flex items-center gap-1 lg:gap-1.5 font-mono text-xs lg:text-sm text-white px-3 lg:px-4 py-2 rounded-xl transition-all hover:opacity-90"
            style={{ background: ORANGE }}
          >
            <ShoppingCart className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
            <span className="hidden sm:inline">Acheter</span>
            <span className="sm:hidden">+</span>
          </button>
        </Link>

        {/* Theme toggle */}
        <button
          onClick={onCycleTheme}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-mono text-xs transition-all hover:opacity-80"
          style={{
            background: 'var(--dt-hover)',
            border: '1px solid var(--dt-border-2)',
            color: 'var(--dt-text-50)',
          }}
          title={`Thème: ${THEME_LABEL[dashTheme]}`}
        >
          <span style={{ color: dashTheme === 'colorful' ? '#6366f1' : 'var(--dt-text-50)' }}>
            {THEME_ICON[dashTheme]}
          </span>
          <span className="hidden sm:inline">{THEME_LABEL[dashTheme]}</span>
        </button>

        <a
          href="mailto:cvkdev@outlook.fr?subject=Feedback%20YelhaDms"
          className="hidden sm:flex items-center gap-1.5 font-mono text-xs px-3 py-2 rounded-xl transition-all"
          style={{ color: 'var(--dt-text-40)', border: '1px solid var(--dt-border)', background: 'transparent' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--dt-text-70)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--dt-border-2)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--dt-text-40)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--dt-border)'; }}
          title="Suggestion ou bug ?"
        >
          💡 Help
        </a>

        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
