export const prerender = false;
import type { APIRoute } from 'astro';

const OWNER = 'RobertoReale';
const REPO = 'blog';
const BRANCH = 'master';

export const POST: APIRoute = async ({ request }) => {
  const token = import.meta.env.BLOG_GITHUB_TOKEN;
  if (!token) {
    return json({ error: 'BLOG_GITHUB_TOKEN not configured.' }, 500);
  }

  let filename: string;
  let content: string;
  try {
    ({ filename, content } = await request.json());
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  if (!filename || !content) {
    return json({ error: 'filename and content are required.' }, 400);
  }

  if (!/^[a-z0-9][a-z0-9-]*\.mdx$/.test(filename)) {
    return json({ error: 'Invalid filename — use lowercase letters, numbers, hyphens, ending in .mdx' }, 400);
  }

  const filePath = `src/content/articles/${filename}`;
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`;
  const ghHeaders = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };

  const existsRes = await fetch(apiUrl, { method: 'GET', headers: ghHeaders });
  if (existsRes.ok) {
    return json({ error: `"${filename}" already exists. Choose a different filename.` }, 409);
  }

  const encoded = Buffer.from(content, 'utf-8').toString('base64');

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: ghHeaders,
    body: JSON.stringify({
      message: `Add article: ${filename.replace(/\.mdx$/, '')}`,
      content: encoded,
      branch: BRANCH,
    }),
  });

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}) as { message?: string });
    return json({ error: (err as { message?: string }).message ?? `GitHub API error (${putRes.status})` }, putRes.status);
  }

  return json({ ok: true, filename }, 200);
};

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
