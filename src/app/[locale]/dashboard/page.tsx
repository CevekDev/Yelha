import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Plug, MessageSquare, Coins, TrendingUp } from 'lucide-react';
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

  const [user, connectionsCount, todayMessages, totalMessages, activity, platformStats] =
    await Promise.all([
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
    ]);

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
  const W = 200;
  const H = 40;
  const points = activity.map((d, i) => {
    const x = (i / (activity.length - 1)) * W;
    const y = H - (d.count / maxCount) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline = points.join(' ');

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
            { label: 'Voir les analytics', href: `/${locale}/dashboard/analytics`, desc: 'Statistiques détaillées' },
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
