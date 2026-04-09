import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Zap, BarChart3, TrendingUp } from 'lucide-react';

export default async function AnalyticsPage({ params: { locale } }: { params: { locale: string } }) {
  const session = await getServerSession(authOptions);

  const [totalMessages, tokensUsed, tokensPurchased, connections] = await Promise.all([
    prisma.message.count({
      where: { conversation: { connection: { userId: session!.user.id } } },
    }),
    prisma.tokenTransaction.aggregate({
      where: { userId: session!.user.id, type: 'USAGE' },
      _sum: { amount: true },
    }),
    prisma.tokenTransaction.aggregate({
      where: { userId: session!.user.id, type: 'PURCHASE' },
      _sum: { amount: true },
    }),
    prisma.connection.findMany({
      where: { userId: session!.user.id },
      include: {
        _count: { select: { conversations: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const tokensUsedAbs = Math.abs(tokensUsed._sum.amount || 0);
  const tokensBought = tokensPurchased._sum.amount || 0;

  const stats = [
    { label: 'Total Messages Processed', value: totalMessages, icon: MessageSquare, color: 'text-blue-600' },
    { label: 'Tokens Used', value: tokensUsedAbs, icon: Zap, color: 'text-orange-600' },
    { label: 'Tokens Purchased', value: tokensBought, icon: TrendingUp, color: 'text-green-600' },
    { label: 'Active Connections', value: connections.filter(c => c.isActive).length, icon: BarChart3, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Overview of your bot activity</p>
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
              <CardContent>
                <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connections Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations by Connection</CardTitle>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No connections yet. Add a platform to start tracking analytics.
            </p>
          ) : (
            <div className="space-y-4">
              {connections.map((conn) => {
                const pct = totalMessages > 0 ? 0 : 0; // placeholder
                return (
                  <div key={conn.id} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{conn.name}</span>
                        <span className="text-sm text-muted-foreground">{conn._count.conversations} conversations</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: connections.length > 0 ? `${(conn._count.conversations / Math.max(...connections.map(c => c._count.conversations), 1)) * 100}%` : '0%' }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{conn.platform} · {conn.isActive ? 'Active' : 'Inactive'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token Usage Info */}
      {tokensBought > 0 && (
        <Card>
          <CardHeader><CardTitle>Token Efficiency</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tokens purchased</p>
                <p className="text-xl font-bold">{tokensBought.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tokens used</p>
                <p className="text-xl font-bold">{tokensUsedAbs.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Usage rate</p>
                <p className="text-xl font-bold">
                  {tokensBought > 0 ? Math.round((tokensUsedAbs / tokensBought) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
