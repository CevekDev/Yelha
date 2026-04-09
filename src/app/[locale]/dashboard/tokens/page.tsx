'use client';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Coins, Loader2, ShoppingCart } from 'lucide-react';

export default function TokensPage() {
  const t = useTranslations('tokens');
  const params = useParams();
  const locale = params.locale as string;
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [packages, setPackages] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loadingPkg, setLoadingPkg] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('success') === 'true') toast({ title: 'Purchase successful!', description: 'Tokens added to your account.' });
    if (searchParams.get('canceled') === 'true') toast({ title: 'Purchase canceled', variant: 'destructive' });
    fetchData();
  }, []);

  const fetchData = async () => {
    const [pkgRes, userRes] = await Promise.all([fetch('/api/tokens/packages'), fetch('/api/user/me')]);
    const [pkgs, user] = await Promise.all([pkgRes.json(), userRes.json()]);
    setPackages(pkgs);
    setBalance(user.tokenBalance || 0);
  };

  const handlePurchase = async (packageId: string) => {
    setLoadingPkg(packageId);
    try {
      const res = await fetch('/api/tokens/purchase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packageId, locale }) });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast({ title: 'Error', description: data.error, variant: 'destructive' });
    } finally { setLoadingPkg(null); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Token Balance</h1>
      <Card className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
        <CardContent className="p-6 flex items-center gap-4">
          <Coins className="w-12 h-12 opacity-80" />
          <div>
            <p className="text-sm opacity-80">{t('balance')}</p>
            <p className="text-4xl font-bold">{balance.toLocaleString()}</p>
            <p className="text-sm opacity-80">{t('tokens')}</p>
          </div>
        </CardContent>
      </Card>
      <div>
        <h2 className="text-lg font-semibold mb-4">Buy Tokens</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.length === 0 ? <p className="text-muted-foreground col-span-3">No packages available. Ask admin to configure them.</p>
          : packages.map((pkg: any) => (
            <Card key={pkg.id} className={pkg.isFeatured ? 'border-primary ring-2 ring-primary' : ''}>
              {pkg.isFeatured && <div className="bg-primary text-primary-foreground text-xs text-center py-1 rounded-t-lg">Most Popular</div>}
              <CardHeader>
                <CardTitle className="flex items-center justify-between">{pkg.name}<Badge variant="secondary">{pkg.tokens.toLocaleString()} tokens</Badge></CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground">
                    {pkg.price.toLocaleString('fr-FR')} DA
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant={pkg.isFeatured ? 'default' : 'outline'} onClick={() => handlePurchase(pkg.id)} disabled={!!loadingPkg}>
                  {loadingPkg === pkg.id ? <Loader2 className="animate-spin me-2" /> : <ShoppingCart className="w-4 h-4 me-2" />}{t('purchase')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
