import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, Coins, Activity, Gift, Tag } from 'lucide-react';
import AdminSettingsForm from '@/components/admin/settings-form';
import AdminTokensPanel from '@/components/admin/tokens-panel';
import AdminMessagesPanel from '@/components/admin/messages-panel';
import AdminPromoPanel from '@/components/admin/promo-panel';

export default async function AdminPage({ params: { locale } }: { params: { locale: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    redirect(`/${locale}/dashboard`);
  }

  const [totalUsers, totalMessages, tokenStats, systemPrompt, allUsers, promoCodes] = await Promise.all([
    prisma.user.count(),
    prisma.message.count(),
    prisma.tokenTransaction.aggregate({
      where: { type: 'PURCHASE' },
      _sum: { amount: true },
    }),
    prisma.systemSetting.findUnique({ where: { key: 'global_system_prompt' } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, tokenBalance: true, role: true, unlimitedTokens: true, createdAt: true },
    }),
    prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { uses: true } } },
    }),
  ]);

  const stats = [
    { label: 'Utilisateurs', value: totalUsers, icon: Users, color: 'text-blue-600' },
    { label: 'Messages traités', value: totalMessages, icon: MessageSquare, color: 'text-green-600' },
    { label: 'Tokens vendus', value: (tokenStats._sum.amount || 0).toLocaleString(), icon: Coins, color: 'text-orange-500' },
    { label: 'Codes promo', value: promoCodes.filter(p => p.isActive).length, icon: Tag, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Vue d&apos;ensemble et gestion de la plateforme Yelha</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tokens management */}
      <AdminTokensPanel users={allUsers} />

      {/* Send messages */}
      <AdminMessagesPanel users={allUsers} />

      {/* Promo codes */}
      <AdminPromoPanel initialCodes={promoCodes} />

      {/* System prompt */}
      <AdminSettingsForm initialPrompt={systemPrompt?.value || ''} />
    </div>
  );
}
