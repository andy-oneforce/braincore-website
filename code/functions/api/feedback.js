/**
 * ASIOS Website — Cloudflare Pages Function: POST /api/feedback
 * Receives the docs "Was this page helpful?" vote (Feedback.mjs / scripts/feedback.js) and writes it
 * to the FEEDBACK Workers KV binding as `feedback:<route>:<epoch-ms>-<rand>`. Accepts JSON
 * ({route, vote}) from the script and urlencoded from the no-JS form; the latter is answered with a
 * small thank-you page instead of JSON. Only a route and a yes/no vote are stored — no PII, no IP.
 * Anything else is refused: other methods (405), cross-origin posts (403), a body over MAX_BODY_BYTES
 * (413), a content type it does not read (415), a route or vote that fails validation (400), and a
 * missing binding (503). Keep this the single file under functions/ (recommendation R6) — its smoke
 * test is tests/feedback-function.test.mjs.
 */

const MAX_BODY_BYTES = 1024;
const TTL_SECONDS = 60 * 60 * 24 * 365; // votes expire after a year so spam cannot grow the namespace without bound
const VOTES = new Set(['yes', 'no']);
// A site-absolute path: no scheme, no `//`, no `..`, no query or fragment, bounded length.
const ROUTE_RE = /^\/[A-Za-z0-9._~\-/]{0,199}$/;

function isValidRoute(route) {
  return typeof route === 'string' && ROUTE_RE.test(route) && !route.includes('//') && !route.includes('..');
}

function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// The no-JS form post is answered with a page, not JSON; `route` is already validated when it is used here.
function page(status, heading, message, route) {
  const back = route ? `<p><a href="${escapeHtml(route)}">Back to the page</a></p>` : '';
  return new Response(
    `<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(heading)}</title></head><body><main><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(message)}</p>${back}</main></body></html>\n`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
  );
}

// Reads the body up to `max` bytes; returns null as soon as it is over, so an oversized or
// chunked body is never buffered whole.
async function readCapped(request, max) {
  const declared = request.headers.get('Content-Length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > max)) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return json(405, { ok: false, error: 'method not allowed' }, { Allow: 'POST' });
  }

  // Same-origin only. Browsers send Origin on every cross-site POST; a missing Origin (curl, older clients) is allowed.
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    return json(403, { ok: false, error: 'cross-origin post refused' });
  }

  const contentType = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const isForm = contentType === 'application/x-www-form-urlencoded';
  if (contentType !== 'application/json' && !isForm) {
    return json(415, { ok: false, error: 'content type must be application/json or application/x-www-form-urlencoded' });
  }

  const raw = await readCapped(request, MAX_BODY_BYTES);
  if (raw === null) return json(413, { ok: false, error: `body over ${MAX_BODY_BYTES} bytes` });

  let route;
  let vote;
  try {
    if (isForm) {
      const params = new URLSearchParams(raw);
      route = params.get('route');
      vote = params.get('vote');
    } else {
      const body = JSON.parse(raw);
      route = body?.route;
      vote = body?.vote;
    }
  } catch (e) {
    return json(400, { ok: false, error: 'body is not valid' });
  }

  if (!isValidRoute(route)) {
    return isForm ? page(400, 'Feedback not sent', 'The page route was not valid.') : json(400, { ok: false, error: 'invalid route' });
  }
  if (typeof vote !== 'string' || !VOTES.has(vote)) {
    return isForm ? page(400, 'Feedback not sent', 'The vote was not valid.', route) : json(400, { ok: false, error: 'vote must be "yes" or "no"' });
  }
  if (!env || !env.FEEDBACK || typeof env.FEEDBACK.put !== 'function') {
    return isForm ? page(503, 'Feedback not sent', 'Feedback is not available right now.', route) : json(503, { ok: false, error: 'feedback store not configured' });
  }

  const ts = Date.now();
  const suffix = Math.random().toString(16).slice(2, 6).padEnd(4, '0');
  const key = `feedback:${route}:${ts}-${suffix}`;
  try {
    await env.FEEDBACK.put(key, JSON.stringify({ route, vote, ts }), {
      metadata: { route, vote },
      expirationTtl: TTL_SECONDS,
    });
  } catch (e) {
    return isForm ? page(502, 'Feedback not sent', 'Could not save your feedback. Please try again.', route) : json(502, { ok: false, error: 'could not store the vote' });
  }
  return isForm ? page(200, 'Thanks for your feedback', 'Your vote was recorded.', route) : json(200, { ok: true });
}
