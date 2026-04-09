'use client';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useEffect, useState } from 'react';

export function DashboardNavbar() {
  const t = useTranslations('dashboard');
  const params = useParams();
  const locale = params.locale as string;
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/user/me').then(r => r.json()).then(u => setBalance(u.tokenBalance));
  }, []);

  return (
    <header className="h-16 border-b bg-card flex items-center px-6 gap-4 justify-end">
      <div className="flex items-center gap-2 text-sm">
        <Coins className="w-4 h-4 text-primary" />
        <span className="font-medium">{balance ?? '...'}</span>
        <span className="text-muted-foreground">{t('tokens')}</span>
      </div>
      <Link href={`/${locale}/dashboard/tokens`}>
        <Button size="sm" variant="outline">{t('buyTokens')}</Button>
      </Link>
      <LanguageSwitcher />
    </header>
  );
}
