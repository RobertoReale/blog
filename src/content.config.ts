import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    tags: z.array(z.string()),
    description: z.string(),
    origin: z.string().optional(),
    originPosition: z.enum(['top', 'bottom']).optional().default('bottom'),
    coverImage: z.string().optional(),
    sources: z.array(z.object({
      label: z.string(),
      href: z.string(),
    })).optional().default([]),
    status: z.enum(['draft', 'published']),
    series: z.string().optional(),
    part: z.number().optional(),
    language: z.enum(['en', 'it']).optional().default('en'),
  }),
});

export const collections = { articles };
