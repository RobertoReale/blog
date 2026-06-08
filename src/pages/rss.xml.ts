import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../config';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const articles = await getCollection('articles', ({ data }) => data.status === 'published');
  const sorted = articles.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: SITE.url,
    items: sorted.map((article) => ({
      title: article.data.title,
      description: article.data.description,
      pubDate: article.data.date,
      link: `/article/${article.slug}`,
    })),
  });
};
