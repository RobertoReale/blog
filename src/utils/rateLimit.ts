const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

// In-memory only — resets on cold start and isn't shared across concurrent
// serverless instances. Still throttles naive scripted abuse within a warm
// instance; not a substitute for the token check itself.
const hits = new Map<string, number[]>();

export function checkRateLimit(key: string, maxRequests = MAX_REQUESTS, windowMs = WINDOW_MS): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter(t => now - t < windowMs);

  if (timestamps.length >= maxRequests) {
    hits.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  hits.set(key, timestamps);

  if (hits.size > 1000) {
    for (const [k, v] of hits) {
      if (v.every(t => now - t >= windowMs)) hits.delete(k);
    }
  }

  return true;
}

export function getClientKey(request: Request, clientAddress?: string): string {
  if (clientAddress) return clientAddress;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}
