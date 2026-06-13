import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import vercel from '@astrojs/vercel/serverless';
import expressiveCode from 'astro-expressive-code';

export default defineConfig({
  site: 'https://blog-roberto-reale.vercel.app',
  output: 'hybrid',
  adapter: vercel(),

  integrations: [
    expressiveCode(),
    tailwind(),
    mdx({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
    sitemap({
      filter: (page) => !page.endsWith('/rss.xml') && !page.endsWith('/robots.txt'),
    }),
    react(),
    keystatic(),
  ],
});
