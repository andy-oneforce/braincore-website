// Smoke test for the docs Feedback widget + Pages Function (260908-013 R04). Run: `npm test`
// (node --test tests/). Calls functions/api/feedback.js directly with an in-memory KV stub —
// no Cloudflare account, no network, no wrangler.
import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/feedback.js';
import { renderFeedback } from '../src/templates/docs/Feedback.mjs';

const URL_ = 'https://example.test/api/feedback';

function makeKv() {
  const store = new Map();
  return {
    store,
    async put(key, value, options) {
      store.set(key, { value, options });
    },
  };
}

function post(body, { headers = {}, url = URL_ } = {}) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

test('a valid vote lands in KV under feedback:<route>:<timestamp>', async () => {
  const FEEDBACK = makeKv();
  const res = await onRequest({ request: post({ route: '/docs/guide/setup.html', vote: 'yes' }), env: { FEEDBACK } });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(FEEDBACK.store.size, 1);
  const [[key, { value, options }]] = [...FEEDBACK.store];
  assert.match(key, /^feedback:\/docs\/guide\/setup\.html:\d+-[0-9a-f]{4}$/);
  const row = JSON.parse(value);
  assert.equal(row.route, '/docs/guide/setup.html');
  assert.equal(row.vote, 'yes');
  assert.equal(typeof row.ts, 'number');
  assert.equal(options.metadata.vote, 'yes');
});

test('a "no" vote lands too, and two votes in one millisecond do not overwrite', async () => {
  const FEEDBACK = makeKv();
  for (let i = 0; i < 20; i++) {
    const res = await onRequest({ request: post({ route: '/docs/a.html', vote: 'no' }), env: { FEEDBACK } });
    assert.equal(res.status, 200);
  }
  assert.ok(FEEDBACK.store.size >= 19, `expected ~20 distinct keys, got ${FEEDBACK.store.size}`);
});

test('the no-JS urlencoded form post is stored and answered with a thank-you page', async () => {
  const FEEDBACK = makeKv();
  const request = new Request(URL_, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ route: '/docs/x.html', vote: 'no' }).toString(),
  });
  const res = await onRequest({ request, env: { FEEDBACK } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('Content-Type'), /text\/html/);
  assert.match(await res.text(), /Thanks for your feedback/);
  assert.equal(FEEDBACK.store.size, 1);
});

test('invalid votes and routes are refused and nothing is written', async () => {
  const cases = [
    { route: '/docs/a.html', vote: 'maybe' },
    { route: '/docs/a.html', vote: 1 },
    { route: '/docs/a.html' },
    { vote: 'yes' },
    { route: 'docs/a.html', vote: 'yes' },
    { route: '//evil.test/x', vote: 'yes' },
    { route: '/docs/../secret', vote: 'yes' },
    { route: 'https://evil.test/', vote: 'yes' },
    { route: '/docs/a.html?x=1', vote: 'yes' },
    { route: '/' + 'a'.repeat(300), vote: 'yes' },
    { route: ['/docs/a.html'], vote: 'yes' },
  ];
  for (const body of cases) {
    const FEEDBACK = makeKv();
    const res = await onRequest({ request: post(body), env: { FEEDBACK } });
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(FEEDBACK.store.size, 0, JSON.stringify(body));
  }
  const FEEDBACK = makeKv();
  assert.equal((await onRequest({ request: post('not json'), env: { FEEDBACK } })).status, 400);
  assert.equal((await onRequest({ request: post('null'), env: { FEEDBACK } })).status, 400);
  assert.equal(FEEDBACK.store.size, 0);
});

test('every method other than POST is refused with 405 + Allow', async () => {
  for (const method of ['GET', 'HEAD', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
    const FEEDBACK = makeKv();
    const res = await onRequest({ request: new Request(URL_, { method }), env: { FEEDBACK } });
    assert.equal(res.status, 405, method);
    assert.equal(res.headers.get('Allow'), 'POST');
    assert.equal(FEEDBACK.store.size, 0);
  }
});

test('an oversized body is refused with 413, declared or chunked', async () => {
  const FEEDBACK = makeKv();
  const big = JSON.stringify({ route: '/docs/a.html', vote: 'yes', pad: 'x'.repeat(2000) });
  const declared = await onRequest({ request: post(big), env: { FEEDBACK } });
  assert.equal(declared.status, 413);

  // No Content-Length: a streamed body that crosses the cap mid-read.
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      for (let i = 0; i < 4; i++) controller.enqueue(enc.encode('x'.repeat(500)));
      controller.close();
    },
  });
  const chunked = new Request(URL_, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: stream,
    duplex: 'half',
  });
  const res = await onRequest({ request: chunked, env: { FEEDBACK } });
  assert.equal(res.status, 413);
  assert.equal(FEEDBACK.store.size, 0);
});

test('a cross-origin post and an unsupported content type are refused', async () => {
  const FEEDBACK = makeKv();
  const cross = await onRequest({
    request: post({ route: '/docs/a.html', vote: 'yes' }, { headers: { Origin: 'https://evil.test' } }),
    env: { FEEDBACK },
  });
  assert.equal(cross.status, 403);
  const same = await onRequest({
    request: post({ route: '/docs/a.html', vote: 'yes' }, { headers: { Origin: 'https://example.test' } }),
    env: { FEEDBACK },
  });
  assert.equal(same.status, 200);
  const text = await onRequest({
    request: post('route=/docs/a.html&vote=yes', { headers: { 'Content-Type': 'text/plain' } }),
    env: { FEEDBACK },
  });
  assert.equal(text.status, 415);
  assert.equal(FEEDBACK.store.size, 1);
});

test('a missing FEEDBACK binding or a failing put is reported, not swallowed', async () => {
  const noBinding = await onRequest({ request: post({ route: '/docs/a.html', vote: 'yes' }), env: {} });
  assert.equal(noBinding.status, 503);
  const failing = { async put() { throw new Error('kv down'); } };
  const res = await onRequest({ request: post({ route: '/docs/a.html', vote: 'yes' }), env: { FEEDBACK: failing } });
  assert.equal(res.status, 502);
});

test('the widget carries the route, real buttons and a live region; non-html routes get none', () => {
  const html = renderFeedback('/docs/guide/setup.html');
  assert.match(html, /<form class="feedback" method="post" action="\/api\/feedback" data-feedback data-route="\/docs\/guide\/setup\.html">/);
  assert.match(html, /<button type="submit" class="feedback__btn" name="vote" value="yes">Yes<\/button>/);
  assert.match(html, /<button type="submit" class="feedback__btn" name="vote" value="no">No<\/button>/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /Was this page helpful\?/);
  assert.equal(renderFeedback('/docs/'), '');
  assert.equal(renderFeedback(''), '');
  assert.ok(!renderFeedback('/docs/a"><script>.html').includes('<script>'));
});
