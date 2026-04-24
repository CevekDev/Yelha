import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import {
  Plug, MessageSquare, Coins, TrendingUp, Zap, BarChart3,
} from 'lucide-react';
import Link from 'next/link';

const ORANGE = '#FF6B2C';

/** Build last-7-days label + count array */
async function getLast7DaysActivity(userId: string) {
  const days: { label: string; count: number }[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - i);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const count = await prisma.message.count({
      where: {
        direction: 'inbound',
        conversation: { connection: { userId } },
        createdAt: { gte: start, lte: end },
      },
    });

    const label = start.toLocaleDateString('fr-DZ', { weekday: 'short' });
    days.push({ label, count });
  }
  return days;
}

/** Per-platform stats */
async function getPlatformStats(userId: string) {
  const platforms = ['TELEGRAM', 'WHATSAPP'] as const;
  return Promise.all(
    platforms.map(async (platform) => {
      const connIds = await prisma.connection.findMany({
        where: { userId, platform, isActive: true },
        select: { id: true },
      });
      const ids = connIds.map((c) => c.id);

      const [convCount, msgToday] = await Promise.all([
        prisma.conversation.count({ where: { connectionId: { in: ids } } }),
        prisma.message.count({
          where: {
            conversation: { connectionId: { in: ids } },
            direction: 'inbound',
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
      ]);

      return { platform, bots: ids.length, convCount, msgToday };
    })
  );
}

export default async function DashboardPage({ params: { locale } }: { params: { locale: string } }) {
  const session = await getServerSession(authOptions);

  if (session?.user.role === 'ADMIN') {
    redirect(`/${locale}/admin`);
  }

  const t = await getTranslations('dashboard');

  const [
    user,
    connectionsCount,
    todayMessages,
    totalMessages,
    activity,
    platformStats,
    tokensUsedAgg,
    tokensPurchasedAgg,
    connections,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session!.user.id },
      select: { tokenBalance: true, name: true, unlimitedTokens: true },
    }),
    prisma.connection.count({ where: { userId: session!.user.id, isActive: true } }),
    prisma.message.count({
      where: {
        conversation: { connection: { userId: session!.user.id } },
        direction: 'inbound',
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.message.count({
      where: {
        direction: 'inbound',
        conversation: { connection: { userId: session!.user.id } },
      },
    }),
    getLast7DaysActivity(session!.user.id),
    getPlatformStats(session!.user.id),
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
      include: { _count: { select: { conversations: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const tokensUsed = Math.abs(tokensUsedAgg._sum.amount || 0);
  const tokensBought = tokensPurchasedAgg._sum.amount || 0;
  const usageRatePct = tokensBought > 0
    ? Math.min(Math.round((tokensUsed / tokensBought) * 100), 100)
    : 0;

  const stats = [
    {
      label: t('tokenBalance'),
      value: user?.unlimitedTokens ? '∞' : (user?.tokenBalance ?? 0).toLocaleString(),
      icon: Coins,
      accent: ORANGE,
      sub: 'tokens disponibles',
    },
    {
      label: t('activeConnections'),
      value: connectionsCount.toLocaleString(),
      icon: Plug,
      accent: '#34d399',
      sub: 'plateformes connectées',
    },
    {
      label: t('messagesToday'),
      value: todayMessages.toLocaleString(),
      icon: MessageSquare,
      accent: '#a78bfa',
      sub: "messages aujourd'hui",
    },
    {
      label: t('totalMessages'),
      value: totalMessages.toLocaleString(),
      icon: TrendingUp,
      accent: '#60a5fa',
      sub: 'messages au total',
    },
  ];

  // Build SVG sparkline (100×40 viewBox)
  const maxCount = Math.max(...activity.map((d) => d.count), 1);
  const maxConversations = Math.max(...connections.map((c) => c._count.conversations), 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-mono text-white">
          Bonjour, <span style={{ color: ORANGE }}>{user?.name || 'utilisateur'}</span> 👋
        </h1>
        <p className="text-white/40 text-sm mt-1 font-mono">
          Voici un aperçu de votre activité aujourd&apos;hui.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 flex flex-col gap-3 hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-white/40 uppercase tracking-wider">{stat.label}</span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${stat.accent}18` }}
                >
                  <Icon className="w-4 h-4" style={{ color: stat.accent }} />
                </div>
              </div>
              <div>
                <p className="text-2xl lg:text-3xl font-bold font-mono text-white">{stat.value}</p>
                <p className="text-xs text-white/30 mt-0.5">{stat.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity chart + Platform breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 7-day activity chart */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-sm font-semibold text-white">Messages — 7 derniers jours</h2>
            <span className="font-mono text-xs text-white/30">{todayMessages} aujourd&apos;hui</span>
          </div>

          {/* Simple SVG bar chart */}
          <div className="flex items-end gap-2 h-28">
            {activity.map((day, i) => {
              const pct = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
              const isToday = i === activity.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${Math.max(pct, 3)}%`,
                        background: isToday ? ORANGE : 'rgba(255,255,255,0.10)',
                        minHeight: '3px',
                      }}
                    />
                  </div>
                  <span className="font-mono text-[9px] text-white/25 capitalize">{day.label}</span>
                  {day.count > 0 && (
                    <span className="font-mono text-[9px] font-bold" style={{ color: isToday ? ORANGE : 'rgba(255,255,255,0.3)' }}>
                      {day.count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Per-platform stats */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="font-mono text-sm font-semibold text-white mb-4">Par plateforme</h2>
          <div className="space-y-4">
            {platformStats.map((ps) => {
              const isTg = ps.platform === 'TELEGRAM';
              const color = isTg ? '#229ED9' : '#25D366';
              const label = isTg ? 'Telegram' : 'WhatsApp';
              return (
                <div key={ps.platform} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-mono font-bold text-white"
                        style={{ background: color }}
                      >
                        {isTg ? 'TG' : 'WA'}
                      </div>
                      <span className="font-mono text-xs text-white/70">{label}</span>
                    </div>
                    <span className="font-mono text-[10px] text-white/30">{ps.bots} bot{ps.bots !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-1.5 text-center">
                      <p className="font-mono text-sm font-bold text-white">{ps.convCount}</p>
                      <p className="font-mono text-[9px] text-white/25">conversations</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-1.5 text-center">
                      <p className="font-mono text-sm font-bold text-white">{ps.msgToday}</p>
                      <p className="font-mono text-[9px] text-white/25">msgs today</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {platformStats.every((ps) => ps.bots === 0) && (
              <p className="font-mono text-xs text-white/20 text-center py-4">Aucun bot connecté</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Analytics section ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Token efficiency */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${ORANGE}20` }}>
              <Zap className="w-4 h-4" style={{ color: ORANGE }} />
            </div>
            <h2 className="font-mono text-sm font-semibold text-white">Tokens</h2>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Achetés', value: tokensBought.toLocaleString(), color: '#34d399' },
              { label: 'Utilisés', value: tokensUsed.toLocaleString(), color: ORANGE },
              { label: "Taux d'usage", value: `${usageRatePct}%`, color: '#a78bfa' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 text-center">
                <p className="text-lg font-bold font-mono" style={{ color: item.color }}>{item.value}</p>
                <p className="text-white/30 text-[10px] font-mono mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${usageRatePct}%`,
                background: `linear-gradient(90deg, ${ORANGE}, #ff9a5c)`,
              }}
            />
          </div>
          <p className="font-mono text-[10px] text-white/20 mt-2">
            {user?.tokenBalance?.toLocaleString() ?? 0} tokens restants
          </p>
        </div>

        {/* Conversations par connexion */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.15)' }}>
              <BarChart3 className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="font-mono text-sm font-semibold text-white">Conversations par bot</h2>
          </div>
          {connections.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-white/30 font-mono text-xs">Aucune connexion configurée.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.slice(0, 5).map((conn) => (
                <div key={conn.id} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-white/70 truncate max-w-[60%]">{conn.name}</span>
                    <span className="text-[10px] font-mono text-white/30">
                      {conn._count.conversations} conv.
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(conn._count.conversations / maxConversations) * 100}%`,
                        background: conn.isActive ? 'linear-gradient(90deg, #a78bfa, #7c3aed)' : 'rgba(255,255,255,0.1)',
                      }}
                    />
                  </div>
                </div>
              ))}
              {connections.length > 5 && (
                <p className="font-mono text-[10px] text-white/20 text-center pt-1">
                  +{connections.length - 5} autres connexions
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {connectionsCount === 0 && (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: `${ORANGE}18` }}
          >
            <Plug className="w-7 h-7" style={{ color: ORANGE }} />
          </div>
          <h3 className="text-lg font-semibold font-mono text-white mb-2">
            Aucune connexion pour l&apos;instant
          </h3>
          <p className="text-white/40 text-sm mb-6 max-w-sm">
            Connectez votre première plateforme de messagerie pour commencer à automatiser vos réponses.
          </p>
          <Link href={`/${locale}/dashboard/connections`}>
            <button
              className="flex items-center gap-2 font-mono text-sm text-white px-5 py-2.5 rounded-xl transition-all hover:opacity-90"
              style={{ background: ORANGE }}
            >
              <Plug className="w-4 h-4" />
              Ajouter une connexion
            </button>
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-mono text-white/40 uppercase tracking-wider mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Acheter des tokens', href: `/${locale}/dashboard/tokens`, desc: 'Recharger votre solde' },
            { label: 'Gérer les connexions', href: `/${locale}/dashboard/connections`, desc: 'Plateformes & bots' },
            { label: 'Voir les commandes', href: `/${locale}/dashboard/orders`, desc: 'Suivi des commandes' },
          ].map((action) => (
            <Link key={action.href} href={action.href}>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.10] transition-all p-4 cursor-pointer group">
                <p className="text-sm font-mono font-medium text-white group-hover:text-[#FF6B2C] transition-colors">
                  {action.label}
                </p>
                <p className="text-xs text-white/30 mt-0.5">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
