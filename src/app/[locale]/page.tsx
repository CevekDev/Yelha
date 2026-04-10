import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MynaHero } from '@/components/ui/myna-hero';
import { Bot, MessageCircle, Zap, Globe, Shield, Coins, ArrowRight, Send, Mic } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';

const ORANGE = '#FF6B2C';

const PRICING = [
  { name: 'Starter',  tokens: '500',    price: '1 590', desc: 'Parfait pour démarrer',    popular: false },
  { name: 'Business', tokens: '2 000',  price: '3 200', desc: 'Pour les entreprises',      popular: true  },
  { name: 'Pro',      tokens: '5 000',  price: '6 000', desc: 'Volume élevé',              popular: false },
  { name: 'Agency',   tokens: '15 000', price: '15 000', desc: 'Agences & revendeurs',     popular: false },
];

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
    title: 'Paiement à l\'usage',
    desc: '1 token par texte, 2 tokens par vocal. Payez uniquement ce que vous utilisez en DZD.',
  },
  {
    icon: Shield,
    title: 'Sécurité enterprise',
    desc: 'Chiffrement AES-256, JWT, rate limiting, CSRF. Vos données restent en sécurité.',
  },
];

export default async function LandingPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations('nav');

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* ── Hero (dark, animated) ── */}
      <MynaHero locale={locale} />

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-white">
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
      <section id="how" className="py-24 bg-gray-50">
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
                desc: 'Inscrivez-vous gratuitement et accédez à votre tableau de bord.',
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

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-white">
        <div className="container max-w-5xl mx-auto px-6 text-center">
          <span
            className="font-mono text-xs font-semibold uppercase tracking-widest"
            style={{ color: ORANGE }}
          >
            Tarifs
          </span>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">
            Tarification simple en tokens
          </h2>
          <p className="mt-4 text-gray-500 mb-14">
            Pas d'abonnement. Achetez des tokens, utilisez quand vous voulez.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRICING.map((pkg) => (
              <div
                key={pkg.name}
                className={`relative flex flex-col rounded-2xl border p-6 text-left transition-all ${
                  pkg.popular
                    ? 'border-orange-400 shadow-xl shadow-orange-100 ring-2 ring-orange-400'
                    : 'border-gray-200 hover:border-orange-200 hover:shadow-md'
                }`}
              >
                {pkg.popular && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-[11px] font-mono font-semibold px-3 py-1 rounded-full whitespace-nowrap"
                    style={{ background: ORANGE }}
                  >
                    ★ Le plus populaire
                  </div>
                )}
                <h3 className="font-mono font-semibold text-gray-900 mb-1">{pkg.name}</h3>
                <div className="my-3">
                  <span className="text-3xl font-bold text-gray-900">{pkg.price}</span>
                  <span className="text-sm text-gray-400 ml-1">DA</span>
                </div>
                <p className="font-mono text-sm font-medium mb-1" style={{ color: ORANGE }}>
                  {pkg.tokens} tokens
                </p>
                <p className="text-xs text-gray-400 mb-6">{pkg.desc}</p>
                <Link href={`/${locale}/auth/signup`} className="mt-auto">
                  <button
                    className={`w-full rounded-xl py-2.5 text-sm font-mono font-semibold transition-all ${
                      pkg.popular
                        ? 'text-white hover:opacity-90'
                        : 'text-gray-700 border border-gray-200 hover:border-orange-300 hover:text-orange-600'
                    }`}
                    style={pkg.popular ? { background: ORANGE } : {}}
                  >
                    Commencer
                  </button>
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-10 text-xs text-gray-400 font-mono">
            1 token = 1 message texte · 2 tokens = 1 message vocal · 0 token = réponses prédéfinies
          </p>
        </div>
      </section>

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
              Commencer gratuitement →
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
