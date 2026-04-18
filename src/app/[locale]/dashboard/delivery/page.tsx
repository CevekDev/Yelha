import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Package, MapPin, Clock, CheckCircle, Zap } from 'lucide-react';
import DeliveryClient, { type ConnectionItem } from './delivery-client';

const ORANGE = '#FF6B2C';

const OTHER_CARRIERS = [
  { name: 'Yalidine', logo: '🚚', desc: 'Livraison express en Algérie', coverage: '58 wilayas', delay: '24-48h' },
  { name: 'Maystro Delivery', logo: '📦', desc: 'Livraison door-to-door', coverage: '48 wilayas', delay: '24-72h' },
  { name: 'Procolis', logo: '🏎️', desc: 'Livraison & logistique', coverage: '58 wilayas', delay: '24-48h' },
  { name: 'Zaki Express', logo: '⚡', desc: 'Express & économique', coverage: '45 wilayas', delay: '24-48h' },
  { name: 'Atlas Express', logo: '🦅', desc: 'Livraison nationale', coverage: '58 wilayas', delay: '48-96h' },
];

const PLAN_ALLOWED = ['BUSINESS', 'PRO', 'AGENCY'];

export default async function DeliveryPage({ params: { locale } }: { params: { locale: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/${locale}/auth/signin`);

  const [connections, user] = await Promise.all([
    prisma.connection.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, platform: true, ecotrackUrl: true, ecotrackToken: true, ecotrackAutoShip: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { planLevel: true } }),
  ]);

  const planAllowed = PLAN_ALLOWED.includes(user?.planLevel ?? 'FREE');

  const items: ConnectionItem[] = connections.map(c => ({
    id: c.id,
    name: c.name,
    platform: c.platform,
    configured: !!(c.ecotrackUrl && c.ecotrackToken),
    ecotrackUrl: c.ecotrackUrl ?? '',
    ecotrackAutoShip: c.ecotrackAutoShip,
    planAllowed,
  }));

  const anyConfigured = items.some(c => c.configured);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold font-mono text-white">Livraison</h1>
          {anyConfigured && (
            <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-full border border-green-500/30 bg-green-500/15 text-green-400">
              ● ACTIF
            </span>
          )}
        </div>
        <p className="text-white/30 text-sm font-mono">
          Connectez Ecotrack à vos connexions bot pour automatiser vos expéditions
        </p>
      </div>

      {/* Ecotrack section */}
      <div>
        <h2 className="font-mono text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
          Ecotrack
        </h2>

        {connections.length === 0 ? (
          <div
            className="rounded-2xl p-6 border"
            style={{ borderColor: `${ORANGE}30`, background: `linear-gradient(135deg, ${ORANGE}08 0%, transparent 60%)` }}
          >
            <p className="font-mono text-sm text-white/50">
              Aucune connexion bot trouvée. Créez d&apos;abord une connexion Telegram ou Instagram.
            </p>
          </div>
        ) : (
          <DeliveryClient connections={items} />
        )}
      </div>

      {/* Other carriers */}
      <div>
        <h2 className="font-mono text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
          Autres transporteurs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {OTHER_CARRIERS.map((carrier) => (
            <div key={carrier.name} className="rounded-2xl p-5 border border-white/[0.06] bg-white/[0.02] opacity-60 cursor-not-allowed">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{carrier.logo}</span>
                <div>
                  <h3 className="font-mono font-semibold text-white text-sm">{carrier.name}</h3>
                  <p className="font-mono text-xs text-white/30">{carrier.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1 text-white/30"><MapPin className="w-3 h-3" /><span>{carrier.coverage}</span></div>
                <div className="flex items-center gap-1 text-white/30"><Clock className="w-3 h-3" /><span>{carrier.delay}</span></div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">NEW</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plan features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl p-6 border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4" style={{ color: ORANGE }} />
            <h3 className="font-mono font-bold text-white">Pack Business+</h3>
          </div>
          <ul className="space-y-2.5">
            {[
              'Validation wilaya/commune via Ecotrack',
              'Création automatique des expéditions',
              'Domicile ou Stop Desk au choix',
              'Numéro de tracking envoyé au client',
            ].map(f => (
              <li key={f} className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-green-400" />
                <span className="font-mono text-xs text-white/60">{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl p-6 border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4" style={{ color: '#8B5CF6' }} />
            <h3 className="font-mono font-bold text-white">Expédition automatique</h3>
          </div>
          <ul className="space-y-2.5">
            {[
              'Expédition déclenchée à la confirmation client',
              'Statut de commande mis à jour automatiquement',
              'Tracking envoyé par le bot sur Telegram',
              'Suppression Ecotrack si commande annulée',
            ].map(f => (
              <li key={f} className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-purple-400" />
                <span className="font-mono text-xs text-white/60">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
