import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MessageSquare, Zap, TrendingUp, BarChart3, Coins, Plug } from 'lucide-react';

const ORANGE = '#FF6B2C';

const SECTION_STYLE = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '16px',
  overflow: 'hidden' as const,
};

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [totalMessages, tokensUsedAgg, tokensPurchasedAgg, connections] = await Promise.all([
    prisma.message.count({
      where: { conversation: { connection: { userId: session.user.id } } },
    }),
    prisma.tokenTransaction.aggregate({
      where: { userId: session.user.id, type: 'USAGE' },
      _sum: { amount: true },
    }),
    prisma.tokenTransaction.aggregate({
      where: { userId: session.user.id, type: 'PURCHASE' },
      _sum: { amount: true },
    }),
    prisma.connection.findMany({
      where: { userId: session.user.id },
      include: { _count: { select: { conversations: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const tokensUsed = Math.abs(tokensUsedAgg._sum.amount || 0);
  const tokensBought = tokensPurchasedAgg._sum.amount || 0;
  const activeConns = connections.filter((c) => c.isActive).length;

  const statCards = [
    {
      label: 'Messages traités',
      value: totalMessages.toLocaleString(),
      icon: MessageSquare,
      color: '#60a5fa',
      bg: 'rgba(96,165,250,0.15)',
    },
    {
      label: 'Tokens utilisés',
      value: tokensUsed.toLocaleString(),
      icon: Zap,
      color: ORANGE,
      bg: `${ORANGE}20`,
    },
    {
      label: 'Tokens achetés',
      value: tokensBought.toLocaleString(),
      icon: Coins,
      color: '#34d399',
      bg: 'rgba(52,211,153,0.15)',
    },
    {
      label: 'Connexions actives',
      value: activeConns.toString(),
      icon: Plug,
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.15)',
    },
  ];

  const maxConversations = Math.max(...connections.map((c) => c._count.conversations), 1);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold font-mono text-white">Analytiques</h1>
        <p className="text-white/40 text-sm mt-1">Aperçu de l'activité de votre bot</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} style={SECTION_STYLE} className="p-4 lg:p-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: card.bg }}
              >
                <Icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
              <p className="text-xl lg:text-2xl font-bold font-mono text-white">{card.value}</p>
              <p className="text-white/30 text-xs font-mono mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Token efficiency */}
      {tokensBought > 0 && (
        <div style={SECTION_STYLE}>
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.06]">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${ORANGE}20` }}>
              <TrendingUp className="w-4 h-4" style={{ color: ORANGE }} />
            </div>
            <h2 className="font-mono font-semibold text-white text-sm">Efficacité des tokens</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Achetés', value: tokensBought.toLocaleString() },
                { label: 'Utilisés', value: tokensUsed.toLocaleString() },
                { label: "Taux d'usage", value: `${Math.round((tokensUsed / Math.max(tokensBought, 1)) * 100)}%` },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-xl lg:text-2xl font-bold font-mono text-white">{item.value}</p>
                  <p className="text-white/30 text-xs font-mono mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div className="mt-4">
              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(Math.round((tokensUsed / Math.max(tokensBought, 1)) * 100), 100)}%`,
                    background: `linear-gradient(90deg, ${ORANGE}, #ff9a5c)`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversations par connexion */}
      <div style={SECTION_STYLE}>
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.06]">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.15)' }}>
            <BarChart3 className="w-4 h-4 text-purple-400" />
          </div>
          <h2 className="font-mono font-semibold text-white text-sm">Conversations par connexion</h2>
        </div>
        <div className="p-5">
          {connections.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-white/30 font-mono text-sm">
                Aucune connexion. Ajoutez une plateforme pour suivre vos statistiques.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((conn) => (
                <div key={conn.id} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-mono text-white/70">{conn.name}</span>
                    <span className="text-xs font-mono text-white/30">
                      {conn._count.conversations} conv. · {conn.platform}
                    </span>
                  </div>
                  <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(conn._count.conversations / maxConversations) * 100}%`,
                        background: conn.isActive ? `linear-gradient(90deg, #a78bfa, #7c3aed)` : 'rgba(255,255,255,0.1)',
                      }}
                    />
                  </div>
                  <p className="text-xs font-mono" style={{ color: conn.isActive ? '#34d399' : 'rgba(255,255,255,0.2)' }}>
                    {conn.isActive ? 'Actif' : 'Inactif'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
