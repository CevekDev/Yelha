'use client';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Plug, Coins, Settings, LogOut, Shield, BarChart3, Bot, Users } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const t = useTranslations('dashboard');
  const tNav = useTranslations('nav');
  const pathname = usePathname();
  const params = useParams();
  const locale = params.locale as string;
  const { data: session } = useSession();

  const navItems = [
    { href: `/${locale}/dashboard`, label: t('overview'), icon: LayoutDashboard },
    { href: `/${locale}/dashboard/connections`, label: t('connections'), icon: Plug },
    { href: `/${locale}/dashboard/tokens`, label: t('tokens'), icon: Coins },
    { href: `/${locale}/dashboard/analytics`, label: t('analytics'), icon: BarChart3 },
    { href: `/${locale}/dashboard/settings`, label: t('settings'), icon: Settings },
  ];

  if (session?.user.role === 'ADMIN') {
    navItems.push({ href: `/${locale}/admin`, label: 'Admin', icon: Shield });
    navItems.push({ href: `/${locale}/admin/waitlist`, label: 'Liste d\'attente', icon: Users });
  }

  return (
    <div className="flex h-full w-64 flex-col bg-card border-e">
      <div className="flex h-16 items-center px-6 border-b">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <Bot className="w-7 h-7 text-primary" />
          <span className="text-xl font-bold text-primary">AiReply</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== `/${locale}/dashboard` && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')}>
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium truncate">{session?.user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{session?.user.email}</p>
        </div>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => signOut({ callbackUrl: `/${locale}/auth/signin` })}>
          <LogOut className="w-4 h-4 me-2" />{tNav('signOut')}
        </Button>
      </div>
    </div>
  );
}
