import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';
import { Plug, MessageSquare, Coins, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function DashboardPage({ params: { locale } }: { params: { locale: string } }) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations('dashboard');

  const [user, connections, todayMessages, totalMessages] = await Promise.all([
    prisma.user.findUnique({ where: { id: session!.user.id }, select: { tokenBalance: true, name: true } }),
    prisma.connection.count({ where: { userId: session!.user.id, isActive: true } }),
    prisma.message.count({ where: { conversation: { connection: { userId: session!.user.id } }, createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
    prisma.message.count({ where: { conversation: { connection: { userId: session!.user.id } } } }),
  ]);

  const stats = [
    { label: t('tokenBalance'), value: user?.tokenBalance ?? 0, icon: Coins, color: 'text-blue-600' },
    { label: t('activeConnections'), value: connections, icon: Plug, color: 'text-green-600' },
    { label: t('messagesToday'), value: todayMessages, icon: MessageSquare, color: 'text-purple-600' },
    { label: t('totalMessages'), value: totalMessages, icon: TrendingUp, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.name}!</h1>
        <p className="text-muted-foreground">Here's what's happening with your bots today.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">{stat.value.toLocaleString()}</p></CardContent>
            </Card>
          );
        })}
      </div>
      {connections === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Plug className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No connections yet</h3>
            <p className="text-muted-foreground mb-4">Connect your first messaging platform to get started.</p>
            <Link href={`/${locale}/dashboard/connections`}><Button>Add Connection</Button></Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
