import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/private/', '/api/'], // منع جوجل من دخول الإدارة والـ API
    },
    sitemap: 'https://artisanimprimeur.vercel.app/sitemap.xml',
  };
}

