import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MynaHero } from '@/components/ui/myna-hero';
import YelhaPricing from '@/components/ui/yelha-pricing';
import { Bot, Globe, Shield, Coins, Send, Mic } from 'lucide-react';

const ORANGE = '#FF6B2C';

const FEATURES = [
  {
    icon: Send,
    title: 'Telegram Bot',
    desc: 'Connectez votre bot Telegram en quelques secondes. Répondez automatiquement à tous vos clients.',
  },
  {
    icon: Globe,
    title: 'IA Multilingue',
    desc: 'Répond en arabe (MSA & Darija), français, anglais et 100+ langues automatiquement.',
  },
  {
    icon: Mic,
    title: 'Messages vocaux',
    desc: 'Transcrit les vocaux via OpenAI Whisper et répond intelligemment en texte.',
  },
  {
    icon: Bot,
    title: 'Personnalité IA',
    desc: 'Ajustez la formalité, les emojis, la longueur et le style de réponse.',
  },
  {
    icon: Coins,
    title: "Paiement à l'usage",
    desc: '1 token par texte, 2 tokens par vocal. Payez uniquement ce que vous utilisez en DZD.',
  },
  {
    icon: Shield,
    title: 'Sécurité enterprise',
    desc: 'Chiffrement AES-256, JWT, rate limiting, CSRF. Vos données restent en sécurité.',
  },
];

export default async function LandingPage({ params: { locale } }: { params: { locale: string } }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* ── Hero (dark, animated) ── */}
      <MynaHero locale={locale} />

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-white scroll-mt-20">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span
              className="font-mono text-xs font-semibold uppercase tracking-widest"
              style={{ color: ORANGE }}
            >
              Fonctionnalités
            </span>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto">
              Une plateforme complète pour automatiser vos réponses et offrir un service client exceptionnel.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group flex flex-col gap-4 p-6 rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all duration-200 bg-white"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: `${ORANGE}15` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: ORANGE }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how" className="py-24 bg-gray-50 scroll-mt-20">
        <div className="container max-w-4xl mx-auto px-6 text-center">
          <span
            className="font-mono text-xs font-semibold uppercase tracking-widest"
            style={{ color: ORANGE }}
          >
            Comment ça marche
          </span>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 mb-16">
            Opérationnel en 3 étapes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                step: '01',
                title: 'Créez votre compte',
                desc: 'Inscrivez-vous et recevez 25 tokens gratuits pour tester le service.',
              },
              {
                step: '02',
                title: 'Connectez Telegram',
                desc: 'Créez un bot via @BotFather et collez le token — le webhook est configuré automatiquement.',
              },
              {
                step: '03',
                title: "L'IA répond pour vous",
                desc: 'Votre bot répond 24h/24 dans la langue de vos clients, en suivant vos instructions.',
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center font-mono text-xl font-bold text-white mb-5"
                  style={{ background: ORANGE }}
                >
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing (dark) ───────────────────────────────────────────── */}
      <YelhaPricing />

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#0A0A0A]">
        <div className="container max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-mono text-4xl md:text-5xl font-bold text-white mb-6">
            Prêt à automatiser <br />
            <span style={{ color: ORANGE }}>vos messages ?</span>
          </h2>
          <p className="text-white/50 text-base mb-10 font-mono">
            Rejoignez les entreprises algériennes qui utilisent Yelha pour gagner du temps.
          </p>
          <Link href={`/${locale}/auth/signup`}>
            <button
              className="font-mono text-white text-sm px-8 py-4 rounded-xl font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{ background: ORANGE, boxShadow: `0 0 32px ${ORANGE}40` }}
            >
              Commencer gratuitement — 25 tokens offerts →
            </button>
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 py-10 bg-[#0A0A0A]">
        <div className="container max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: ORANGE }}
            >
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-mono font-bold text-white">Yelha</span>
          </div>
          <p className="font-mono text-xs text-white/30">© 2025 Yelha. Tous droits réservés.</p>
          <div className="flex gap-5 font-mono text-xs text-white/30">
            <Link href={`/${locale}/privacy`} className="hover:text-white/60 transition-colors">Confidentialité</Link>
            <Link href={`/${locale}/terms`} className="hover:text-white/60 transition-colors">CGU</Link>
            <Link href={`/${locale}/contact`} className="hover:text-white/60 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
