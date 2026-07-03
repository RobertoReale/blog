export const prerender = false;
import type { APIRoute } from 'astro';

const OWNER = 'RobertoReale';
const REPO = 'blog';
const BRANCH = 'master';
const ARTICLES_DIR = 'src/content/articles';

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
  return provided === expected;
}

function ghHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

function parseFrontmatterField(yaml: string, key: string): string | null {
  const m = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

function applyStatus(mdx: string, status: string): string {
  if (/^status:\s*["']?(?:draft|published)["']?\s*$/m.test(mdx)) {
    return mdx.replace(/^status:\s*["']?(?:draft|published)["']?\s*$/m, `status: ${status}`);
  }
  return mdx.replace(/^---(\r?\n[\s\S]*?\r?\n)---/m, (match, inner) => `---${inner}status: ${status}\n---`);
}

// List all articles with their parsed frontmatter (title, status, date, tags).
export const GET: APIRoute = async ({ request }) => {
  if (!checkToken(request)) return json({ error: 'Unauthorized' }, 401);

  const token = import.meta.env.BLOG_GITHUB_TOKEN;
  if (!token) return json({ error: 'BLOG_GITHUB_TOKEN not configured.' }, 500);

  const listRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${ARTICLES_DIR}?ref=${BRANCH}`,
    { headers: ghHeaders(token) },
  );
  if (!listRes.ok) {
    return json({ error: `Failed to list articles (${listRes.status})` }, listRes.status);
  }
  const files = (await listRes.json()) as Array<{ name: string }>;
  const mdxFiles = files.filter(f => f.name.endsWith('.mdx'));

  const articles = await Promise.all(
    mdxFiles.map(async (file) => {
      // Fetch content via the authenticated Contents API (not download_url) —
      // raw.githubusercontent.com sits behind a CDN that can serve stale content
      // for minutes after a commit, which made the list show old statuses.
      const fileRes = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/contents/${ARTICLES_DIR}/${file.name}?ref=${BRANCH}`,
        { headers: ghHeaders(token) },
      );
      const fileData = (await fileRes.json()) as { content: string };
      const raw = Buffer.from(fileData.content, 'base64').toString('utf-8');
      const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const yaml = match ? match[1] : '';
      const rawDate = parseFrontmatterField(yaml, 'date');
      const parsed = rawDate ? new Date(rawDate) : null;
      return {
        slug: file.name.replace(/\.mdx$/, ''),
        title: parseFrontmatterField(yaml, 'title') ?? file.name,
        status: parseFrontmatterField(yaml, 'status') ?? 'draft',
        date: parsed && !isNaN(parsed.valueOf()) ? parsed.toISOString().slice(0, 10) : rawDate,
        series: parseFrontmatterField(yaml, 'series'),
      };
    }),
  );

  articles.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  return json({ articles }, 200);
};

// Apply a bulk action (set-status | delete) to a list of article slugs.
export const POST: APIRoute = async ({ request }) => {
  if (!checkToken(request)) return json({ error: 'Unauthorized' }, 401);

  const token = import.meta.env.BLOG_GITHUB_TOKEN;
  if (!token) return json({ error: 'BLOG_GITHUB_TOKEN not configured.' }, 500);

  let body: { action?: string; slugs?: string[]; status?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  const { action, slugs, status } = body;
  if (!Array.isArray(slugs) || slugs.length === 0) {
    return json({ error: 'slugs must be a non-empty array.' }, 400);
  }
  if (action !== 'set-status' && action !== 'delete') {
    return json({ error: 'action must be "set-status" or "delete".' }, 400);
  }
  if (action === 'set-status' && status !== 'draft' && status !== 'published') {
    return json({ error: 'status must be "draft" or "published".' }, 400);
  }
  for (const slug of slugs) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
      return json({ error: `Invalid slug: "${slug}"` }, 400);
    }
  }

  const headers = ghHeaders(token);
  const results: Array<{ slug: string; ok: boolean; error?: string }> = [];

  for (const slug of slugs) {
    const filePath = `${ARTICLES_DIR}/${slug}.mdx`;
    const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`;

    try {
      const getRes = await fetch(`${apiUrl}?ref=${BRANCH}`, { headers });
      if (!getRes.ok) {
        results.push({ slug, ok: false, error: `Not found (${getRes.status})` });
        continue;
      }
      const fileData = (await getRes.json()) as { sha: string; content: string };

      if (action === 'delete') {
        const delRes = await fetch(apiUrl, {
          method: 'DELETE',
          headers,
          body: JSON.stringify({
            message: `Delete article: ${slug}`,
            sha: fileData.sha,
            branch: BRANCH,
          }),
        });
        if (!delRes.ok) {
          const err = await delRes.json().catch(() => ({}) as { message?: string });
          results.push({ slug, ok: false, error: (err as { message?: string }).message ?? `Delete failed (${delRes.status})` });
          continue;
        }
      } else {
        const decoded = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const updated = applyStatus(decoded, status!);
        const putRes = await fetch(apiUrl, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            message: `Set status "${status}": ${slug}`,
            content: Buffer.from(updated, 'utf-8').toString('base64'),
            sha: fileData.sha,
            branch: BRANCH,
          }),
        });
        if (!putRes.ok) {
          const err = await putRes.json().catch(() => ({}) as { message?: string });
          results.push({ slug, ok: false, error: (err as { message?: string }).message ?? `Update failed (${putRes.status})` });
          continue;
        }
      }

      results.push({ slug, ok: true });
    } catch {
      results.push({ slug, ok: false, error: 'Network error' });
    }
  }

  return json({ results }, 200);
};
