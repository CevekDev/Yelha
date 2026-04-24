import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dms.yelha.net';
  const locales = ['fr', 'en', 'ar'];

  // Static dates per route type — avoids Google penalizing constant date changes on deploy
  const publicRoutes = [
    { path: '',        priority: 1.0, changeFrequency: 'weekly'  as const, lastMod: new Date() },
    { path: '/contact', priority: 0.7, changeFrequency: 'monthly' as const, lastMod: new Date('2025-01-01') },
    { path: '/privacy', priority: 0.5, changeFrequency: 'yearly'  as const, lastMod: new Date('2025-01-01') },
    { path: '/terms',   priority: 0.5, changeFrequency: 'yearly'  as const, lastMod: new Date('2025-01-01') },
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const route of publicRoutes) {
      entries.push({
        url: `${baseUrl}/${locale}${route.path}`,
        lastModified: route.lastMod,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      });
    }
  }

  return entries;
}
