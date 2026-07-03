import type { APIRoute } from 'astro';
import { SITE } from '../config';

export const GET: APIRoute = () => {
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /keystatic\nSitemap: ${SITE.url}/sitemap-index.xml\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
};
