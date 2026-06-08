#!/usr/bin/env node
// Exports existing-tags.md and existing-series.md to the Desktop
// by scanning src/content/articles/ frontmatter.
// Usage: node scripts/export-blog-context.js

import fs   from 'fs';
import path from 'path';
import os   from 'os';
import { fileURLToPath } from 'url';

const __dirname    = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = path.join(__dirname, '..', 'src', 'content', 'articles');
const DESKTOP      = path.join(os.homedir(), 'Desktop');
const TAGS_OUT     = path.join(DESKTOP, 'existing-tags.md');
const SERIES_OUT   = path.join(DESKTOP, 'existing-series.md');

// ── Frontmatter parser ──────────────────────────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result = {};

  const tagsLine = yaml.match(/^tags:\s*\[([^\]]*)\]/m);
  if (tagsLine) {
    result.tags = tagsLine[1]
      .split(',')
      .map(t => t.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }

  const seriesLine = yaml.match(/^series:\s*["']?(.+?)["']?\s*$/m);
  if (seriesLine) result.series = seriesLine[1].trim();

  const partLine = yaml.match(/^part:\s*(\d+)/m);
  if (partLine) result.part = parseInt(partLine[1], 10);

  const titleLine = yaml.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  if (titleLine) result.title = titleLine[1].trim();

  return result;
}

// ── Scan articles ────────────────────────────────────────────────────────────

function scanArticles() {
  const files = fs.readdirSync(ARTICLES_DIR)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'));

  const tagCount  = {};
  const seriesMap = {};

  for (const file of files) {
    const slug    = file.replace(/\.(mdx?)$/, '');
    const content = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf-8');
    const fm      = parseFrontmatter(content);

    for (const tag of (fm.tags || [])) {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    }

    if (fm.series) {
      if (!seriesMap[fm.series]) seriesMap[fm.series] = { count: 0, parts: [] };
      seriesMap[fm.series].count++;
      seriesMap[fm.series].parts.push({
        part:  fm.part  ?? '?',
        title: fm.title ?? slug,
        slug,
      });
    }
  }

  for (const s of Object.values(seriesMap)) {
    s.parts.sort((a, b) => (a.part > b.part ? 1 : -1));
  }

  return { tagCount, seriesMap };
}

// ── Build files ──────────────────────────────────────────────────────────────

function buildTagsFile(tagCount) {
  const sorted = Object.entries(tagCount).sort(([a], [b]) => a.localeCompare(b));

  const lines = [
    '# Existing Tags',
    '',
    'This file is a reference for AI agents when writing articles.',
    '**Before choosing tags, read this list and reuse existing tags whenever they fit.**',
    "Coin a new tag only when no existing one covers the article's main domain.",
    'When a new tag is coined and accepted, add it here with a description.',
    '',
    '*Auto-generated — run `node scripts/export-blog-context.js` from the blog root to refresh.*',
    '',
    '---',
    '',
    '## Current tags',
    '',
  ];

  if (sorted.length === 0) {
    lines.push('*(no tags found)*');
  } else {
    for (const [tag, count] of sorted) {
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

function buildSeriesFile(seriesMap) {
  const sorted = Object.entries(seriesMap).sort(([a], [b]) => a.localeCompare(b));

  const lines = [
    '# Existing Series',
    '',
    'This file is a reference for AI agents when writing series articles.',
    '**If the user asks for a series article, check this list first.**',
    'Use the exact series name as listed — casing matters (it becomes a URL slug).',
    "If it's a new series, coin a clear name, note it as new, and let the user confirm before writing.",
    '',
    '*Auto-generated — run `node scripts/export-blog-context.js` from the blog root to refresh.*',
    '',
    '---',
    '',
    '## Current series',
    '',
  ];

  if (sorted.length === 0) {
    lines.push('*(no series found)*');
  } else {
    for (const [name, data] of sorted) {
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

// ── Main ─────────────────────────────────────────────────────────────────────

const { tagCount, seriesMap } = scanArticles();

fs.writeFileSync(TAGS_OUT,   buildTagsFile(tagCount),   'utf-8');
fs.writeFileSync(SERIES_OUT, buildSeriesFile(seriesMap), 'utf-8');

const tagList = Object.entries(tagCount)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([t, c]) => `${t} (${c})`)
  .join(', ') || 'none';

const seriesList = Object.entries(seriesMap)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([n, d]) => `"${n}" (${d.count} parts)`)
  .join(', ') || 'none';

console.log(`\nexisting-tags.md   → ${TAGS_OUT}`);
console.log(`  Tags: ${tagList}`);
console.log(`\nexisting-series.md → ${SERIES_OUT}`);
console.log(`  Series: ${seriesList}\n`);
