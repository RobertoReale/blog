export const prerender = false;
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { timingSafeEqual } from 'node:crypto';

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function checkToken(request: Request): boolean {
  const expected = import.meta.env.ADMIN_TOKEN;
  if (!expected) return false;
  const provided = request.headers.get('X-Admin-Token');
  if (!provided) return false;
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

function buildTagsFile(sortedTags: [string, number][]): string {
  const lines = [
    '# Existing Tags',
    '',
    'This file is a reference for writing articles.',
    '**Before choosing tags, read this list and reuse existing tags whenever they fit.**',
    "Coin a new tag only when no existing one covers the article's main domain.",
    'When a new tag is coined and accepted, add it here with a description.',
    '',
    '---',
    '',
    '## Current tags',
    '',
  ];
  if (sortedTags.length === 0) {
    lines.push('*(no tags found)*');
  } else {
    for (const [tag, count] of sortedTags) {
      lines.push(`- **${tag}** *(${count} article${count === 1 ? '' : 's'})*`);
    }
  }
  lines.push(
    '',
    '---',
    '',
    '## How to use this file',
    '',
    '1. At the end of Phase 2, propose 2–4 tags for the article.',
    '2. For each tag, state whether it is **reused** (from this list) or **new** (coined now), and one-line justification.',
    '3. If you coin a new tag, flag it explicitly so the user can confirm and add it here.',
    '4. Never use more than 4 tags. Prefer fewer, broader tags over many specific ones.',
    '',
  );
  return lines.join('\n');
}

function buildSeriesFile(sortedSeries: [string, { count: number; parts: { part: number | string; title: string; slug: string }[] }][]): string {
  const lines = [
    '# Existing Series',
    '',
    'This file is a reference for writing series articles.',
    '**If the user asks for a series article, check this list first.**',
    'Use the exact series name as listed — casing matters (it becomes a URL slug).',
    "If it's a new series, coin a clear name, note it as new, and let the user confirm before writing.",
    '',
    '---',
    '',
    '## Current series',
    '',
  ];
  if (sortedSeries.length === 0) {
    lines.push('*(no series found)*');
  } else {
    for (const [name, data] of sortedSeries) {
      lines.push(`- **${name}** (${data.count} part${data.count === 1 ? '' : 's'} published)`);
      for (const p of data.parts) {
        lines.push(`  — Part ${p.part}: "${p.title}" (\`${p.slug}\`)`);
      }
      lines.push('');
    }
  }
  lines.push(
    '---',
    '',
    '## How to use this file',
    '',
    '- If the user says "this belongs to an existing series", match the name exactly from this list.',
    '- If the user proposes a new series name, flag it as new and confirm before using it in frontmatter.',
    '- `series` and `part` must both be present in frontmatter when used; omit both if the article is standalone.',
    '',
  );
  return lines.join('\n');
}

export const GET: APIRoute = async ({ request }) => {
  if (!checkToken(request)) return json({ error: 'Unauthorized' }, 401);

  const articles = await getCollection('articles');

  const tagCount: Record<string, number> = {};
  const seriesMap: Record<string, {
    count: number;
    parts: { part: number | string; title: string; slug: string }[];
  }> = {};

  for (const article of articles) {
    for (const tag of (article.data.tags ?? [])) {
      tagCount[tag] = (tagCount[tag] ?? 0) + 1;
    }
    if (article.data.series) {
      const s = article.data.series;
      if (!seriesMap[s]) seriesMap[s] = { count: 0, parts: [] };
      seriesMap[s].count++;
      seriesMap[s].parts.push({
        part: article.data.part ?? '?',
        title: article.data.title,
        slug: article.id,
      });
    }
  }

  for (const s of Object.values(seriesMap)) {
    s.parts.sort((a, b) => (a.part > b.part ? 1 : -1));
  }

  const sortedTags = Object.entries(tagCount).sort(([a], [b]) => a.localeCompare(b));
  const sortedSeries = Object.entries(seriesMap).sort(([a], [b]) => a.localeCompare(b));

  return json({
    tagsContent: buildTagsFile(sortedTags),
    seriesContent: buildSeriesFile(sortedSeries),
    tagCount: sortedTags.length,
    seriesCount: sortedSeries.length,
    articleCount: articles.length,
  }, 200);
};
