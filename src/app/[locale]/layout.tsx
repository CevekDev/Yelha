import type { Metadata } from 'next';
import { Inter, Cairo } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { SessionProvider } from '@/components/providers/session-provider';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  preload: true,
});

const locales = ['fr', 'en', 'ar'];

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  return staticMetadata(locale);
}

function staticMetadata(locale: string): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dms.yelha.net';
  const ogLocale = locale === 'ar' ? 'ar_DZ' : locale === 'en' ? 'en_US' : 'fr_DZ';

  const titleDefault =
    locale === 'ar'
      ? 'يلها DMS — بوت ذكاء اصطناعي للشركات الجزائرية'
      : 'YelhaDms — Bot IA pour les entreprises algériennes';

  return {
    title: {
      default: titleDefault,
      template: '%s | YelhaDms',
    },
    description:
      'Automatisez vos réponses Telegram avec une IA intelligente. Parle arabe (Darija & MSA), français, anglais. Paiement en Dinars Algériens (DZD) via Chargily.',
    keywords: [
      // Français
      'bot telegram algérie', 'intelligence artificielle algérie', 'chatbot DZ',
      'automatisation messages algérie', 'bot ia darija', 'bot telegram DZD',
      'yelha', 'service client automatique algérie', 'bot arabe algérie', 'SaaS algérie',
      'chatbot algerie', 'bot whatsapp algerie', 'repondeur automatique',
      'gestion commandes telegram', 'automatisation vente algerie', 'chatbot ecommerce dz',
      'bot ecommerce algerie', 'abonnement dinars algerie',
      // Darija translittéré
      'bot telegram dzair', 'rdoud automatique telegram', 'bot ia dzayer',
      'bot darija algerie', 'bot AI bladi', 'gestion commandes whatsapp',
      // Arabe
      'بوت تيليجرام الجزائر', 'ذكاء اصطناعي جزائر', 'رد تلقائي جزائر',
    ],
    authors: [{ name: 'YelhaDms', url: baseUrl }],
    creator: 'YelhaDms',
    publisher: 'YelhaDms',
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        'fr': `${baseUrl}/fr`,
        'en': `${baseUrl}/en`,
        'ar': `${baseUrl}/ar`,
        'x-default': `${baseUrl}/fr`,  // fallback for unmatched locales
      },
    },
    openGraph: {
      type: 'website',
      locale: ogLocale,
      url: `${baseUrl}/${locale}`,
      siteName: 'YelhaDms',
      title: titleDefault,
      description:
        'Automatisez vos réponses Telegram avec une IA intelligente. Arabe (Darija & MSA), français, anglais. Paiement DZD.',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'YelhaDms — Bot IA Algérie' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'YelhaDms — Bot IA',
      description: 'Automatisez vos messages Telegram avec une IA qui parle Darija, arabe, français.',
      images: ['/og-image.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: { icon: '/favicon.ico' },
    other: {
      'geo.region': 'DZ',
      'geo.country': 'Algeria',
    },
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale)) notFound();

  const messages = await getMessages();
  const isRTL = locale === 'ar';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dms.yelha.net';

  // ── SoftwareApplication schema ─────────────────────────────────────────────
  const softwareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'YelhaDms',
    url: baseUrl,
    description: 'Bot IA pour automatiser les réponses Telegram des entreprises algériennes. Supporte le Darija, arabe, français, anglais. Paiement DZD.',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', priceCurrency: 'DZD', price: '0', availability: 'https://schema.org/InStock' },
    // aggregateRating removed — no real review system in place yet
    publisher: { '@type': 'Organization', name: 'YelhaDms', url: baseUrl },
    inLanguage: ['fr', 'ar', 'en'],
    areaServed: { '@type': 'Country', name: 'Algeria' },
  };

  // ── Organization schema (improves local Algerian SEO) ─────────────────────
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'YelhaDms',
    url: baseUrl,
    logo: `${baseUrl}/og-image.png`,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'cvkdev@outlook.fr',
      availableLanguage: ['French', 'Arabic', 'English'],
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'DZ',
    },
    areaServed: { '@type': 'Country', name: 'Algeria' },
    sameAs: [
      `${baseUrl}`,
    ],
  };

  return (
    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'} className={`${inter.variable} ${cairo.variable} dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            const theme = localStorage.getItem('theme') || 'dark';
            document.documentElement.classList.add(theme);
          })();
        ` }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className={`${isRTL ? 'font-cairo' : 'font-sans'} antialiased bg-background text-foreground`} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <ThemeProvider>
              {children}
              <Toaster />
            </ThemeProvider>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
