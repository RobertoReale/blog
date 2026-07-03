import { getCollection } from 'astro:content';
import { SITE } from '../../../config';
import type { APIRoute } from 'astro';

export const prerender = true;

export async function getStaticPaths() {
  const allArticles = await getCollection('articles');
  const published = allArticles.filter(a => a.data.status === 'published');

  return published.map(entry => ({
    params: { slug: entry.id },
    props: { entry },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { entry } = props;
  const credits = `\n\n---\n\n*Author: ${SITE.author}*\n*Source: ${SITE.url}/article/${entry.id}*`;
  const content = entry.body + credits;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${entry.id}.mdx"`,
    },
  });
}
