import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, MessageCircle, Zap, Globe, Shield, Coins, ArrowRight, Send, Instagram, Facebook, Lock } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { WaitlistForm } from '@/components/waitlist-form';

const PRICING = [
  { name: 'Starter',  tokens: '500',    price: '1 590', desc: 'Parfait pour démarrer',      popular: false },
  { name: 'Business', tokens: '2 000',  price: '3 200', desc: 'Pour les entreprises',        popular: true  },
  { name: 'Pro',      tokens: '5 000',  price: '6 000', desc: 'Volume élevé',                popular: false },
  { name: 'Agency',   tokens: '15 000', price: '15 000', desc: 'Agences & revendeurs',       popular: false },
];

export default async function LandingPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations('nav');

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-7 h-7 text-primary" />
            <span className="text-xl font-bold text-primary">AiReply</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link href={`/${locale}/auth/signin`}>
              <Button variant="ghost">{t('signIn')}</Button>
            </Link>
            <Link href={`/${locale}/auth/signup`}>
              <Button>{t('signUp')}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 text-center">
        <div className="container">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Propulsé par DeepSeek AI
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Réponses IA pour<br />
            <span className="text-primary">chaque conversation</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Automatisez vos messages WhatsApp et Telegram avec une IA intelligente
            qui parle arabe (Darija & MSA), français, anglais, et toute autre langue.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href={`/${locale}/auth/signup`}>
              <Button size="lg" className="gap-2">
                Commencer gratuitement <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={`/${locale}/auth/signin`}>
              <Button size="lg" variant="outline">Se connecter</Button>
            </Link>
          </div>

          {/* Platform pills */}
          <div className="flex items-center justify-center gap-3 mt-10 flex-wrap">
            <div className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 text-sm font-medium">
              <MessageCircle className="w-4 h-4" /> WhatsApp
              <Badge className="ms-1 bg-green-600 text-white text-[10px] px-1.5 py-0">Disponible</Badge>
            </div>
            <div className="flex items-center gap-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-full px-3 py-1 text-sm font-medium">
              <Send className="w-4 h-4" /> Telegram
              <Badge className="ms-1 bg-sky-600 text-white text-[10px] px-1.5 py-0">Disponible</Badge>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 text-gray-400 border border-gray-200 rounded-full px-3 py-1 text-sm font-medium opacity-70">
              <Instagram className="w-4 h-4" /> Instagram
              <Badge className="ms-1 bg-gray-400 text-white text-[10px] px-1.5 py-0">Prochainement</Badge>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 text-gray-400 border border-gray-200 rounded-full px-3 py-1 text-sm font-medium opacity-70">
              <Facebook className="w-4 h-4" /> Facebook
              <Badge className="ms-1 bg-gray-400 text-white text-[10px] px-1.5 py-0">Prochainement</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Tout ce dont vous avez besoin</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: MessageCircle, title: 'WhatsApp & Telegram', desc: 'Connectez WhatsApp Business via Twilio et vos bots Telegram en quelques minutes.' },
              { icon: Globe, title: 'IA Multilingue', desc: 'Répond en arabe (MSA & Darija), français, anglais, et 100+ langues automatiquement.' },
              { icon: Zap, title: 'Messages vocaux', desc: 'Transcrit les vocaux via OpenAI Whisper et répond intelligemment en texte.' },
              { icon: Bot, title: 'Personnalité personnalisée', desc: 'Ajustez la formalité, la convivialité, la longueur des réponses et les emojis.' },
              { icon: Coins, title: 'Tarification à l\'usage', desc: 'Payez uniquement ce que vous consommez. 1 token par texte, 2 tokens pour les vocaux.' },
              { icon: Shield, title: 'Sécurité enterprise', desc: 'Chiffrement AES-256, auth JWT, rate limiting, CSRF et conformité RGPD.' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.title}>
                  <CardContent className="p-6">
                    <Icon className="w-10 h-10 text-primary mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                    <p className="text-muted-foreground text-sm">{f.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Tarification simple en tokens</h2>
          <p className="text-muted-foreground mb-12">Pas d'abonnement. Achetez des tokens, utilisez quand vous voulez.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {PRICING.map((pkg) => (
              <Card key={pkg.name} className={`relative ${pkg.popular ? 'border-primary ring-2 ring-primary' : ''}`}>
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full whitespace-nowrap">
                    Le plus populaire
                  </div>
                )}
                <CardContent className="p-6 text-center">
                  <h3 className="font-semibold mb-1">{pkg.name}</h3>
                  <div className="text-3xl font-bold my-3">
                    {pkg.price} <span className="text-lg font-medium text-muted-foreground">DA</span>
                  </div>
                  <p className="text-primary font-medium mb-2">{pkg.tokens} tokens</p>
                  <p className="text-sm text-muted-foreground mb-4">{pkg.desc}</p>
                  <Link href={`/${locale}/auth/signup`}>
                    <Button className="w-full" variant={pkg.popular ? 'default' : 'outline'}>
                      Démarrer
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Coming Soon platforms */}
      <section className="py-20 bg-muted/30">
        <div className="container text-center">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Lock className="w-4 h-4" />
            Prochainement
          </div>
          <h2 className="text-3xl font-bold mb-4">Instagram & Facebook arrivent bientôt</h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
            Nous travaillons activement sur l'intégration des DMs Instagram et Facebook Messenger.
            Laissez votre email pour être notifié en priorité.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Card className="border-pink-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Instagram className="w-6 h-6 text-pink-500" />
                  <span className="font-semibold">Instagram DM</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Répondre automatiquement à vos DMs Instagram</p>
                <WaitlistForm platform="instagram" label="Instagram" />
              </CardContent>
            </Card>
            <Card className="border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Facebook className="w-6 h-6 text-blue-600" />
                  <span className="font-semibold">Facebook Messenger</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Automatisez vos conversations Messenger</p>
                <WaitlistForm platform="facebook" label="Facebook" />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-12">Comment ça marche</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Connectez vos plateformes', desc: 'Liez WhatsApp Business via Twilio ou créez un bot Telegram en quelques minutes.' },
              { step: '2', title: 'Configurez votre IA', desc: 'Définissez la personnalité, les réponses prédéfinies, les horaires et les instructions.' },
              { step: '3', title: 'L\'IA s\'occupe du reste', desc: 'Votre bot répond automatiquement 24h/24 dans la langue de vos clients.' },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-muted/30">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Prêt à automatiser vos messages ?</h2>
          <p className="text-muted-foreground mb-8">
            Rejoignez les entreprises qui utilisent AiReply pour gagner du temps et améliorer leur service client.
          </p>
          <Link href={`/${locale}/auth/signup`}>
            <Button size="lg" className="gap-2">
              Commencer gratuitement <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <span className="font-semibold">AiReply</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2025 AiReply. Tous droits réservés.</p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground">Politique de confidentialité</Link>
            <Link href="#" className="hover:text-foreground">CGU</Link>
            <Link href="#" className="hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
