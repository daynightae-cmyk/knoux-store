import type { MetadataRoute } from 'next';
import { softwareProducts } from '@/data/software';
import { growthChannelsDetail } from '@/data/growth';
import { solutions } from '@/data/solutions';
import { wordpressCategories } from '@/data/wordpress';
import { creativeDisciplines, webSystems } from '@/data/services';

const ORIGIN = 'https://knoux.store';

const PRIORITY: Record<string, number> = {
  '/': 1,
  '/products': 0.9,
  '/solutions': 0.85,
  '/build': 0.85,
  '/wordpress': 0.8,
  '/web': 0.8,
  '/growth': 0.8,
  '/creative': 0.8,
  '/contact': 0.7,
  '/about': 0.6,
  '/labs': 0.5,
  '/work': 0.5,
  '/engineering': 0.5,
};

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    '/',
    '/products',
    '/wordpress',
    ...wordpressCategories.map((category: (typeof wordpressCategories)[number]) => category.route),
    '/web',
    ...webSystems.map((system) => `/web/${system.slug}`),
    '/growth',
    ...growthChannelsDetail.map((channel) => `/growth/${channel.slug}`),
    '/creative',
    ...creativeDisciplines.map((discipline) => `/creative/${discipline.slug}`),
    '/solutions',
    ...solutions.map((solution) => `/solutions/${solution.slug}`),
    '/build',
    '/labs',
    '/work',
    '/engineering',
    '/about',
    '/contact',
    // The account routes. They hold nothing confidential, so they are listed
    // like the rest of the site rather than hidden.
    '/login',
    '/register',
    '/forgot-password',
  ];

  const productRoutes = softwareProducts.map((product) => `/products/${product.slug}`);

  return [...new Set([...staticRoutes, ...productRoutes])].map((path) => ({
    url: `${ORIGIN}${path}`,
    changeFrequency: path === '/' ? ('weekly' as const) : ('monthly' as const),
    priority: PRIORITY[path] ?? (path.startsWith('/products/') ? 0.8 : 0.6),
  }));
}
