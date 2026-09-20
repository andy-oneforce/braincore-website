// Docs page actions — "Copy as Markdown", "Open in Claude", "Open in ChatGPT" — rendered beside the
// page heading. The raw Markdown lives at the page's own route with `.md` for `.html` (build.mjs
// writes it), so /docs/guide/setup.html <-> /docs/guide/setup.md.
//
// The two Open links are plain prefilled-prompt URLs and work with JS off. The Copy button needs
// scripts/page-actions.js, so it ships `hidden` and the script reveals it; its `data-md-src` names
// the .md route to fetch. Returns '' when the route is not a `.html` page.

import { canonicalUrlFor } from '../../render/head.mjs';

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderPageActions(urlPath) {
  if (!/\.html$/.test(String(urlPath || ''))) return '';
  const mdRoute = urlPath.replace(/\.html$/, '.md');
  const prompt = encodeURIComponent(`Read ${canonicalUrlFor(urlPath)} so I can ask questions about it.`);
  const claudeHref = `https://claude.ai/new?q=${prompt}`;
  const chatgptHref = `https://chatgpt.com/?q=${prompt}`;
  return `<div class="page-actions" role="group" aria-label="Page actions">
<button type="button" class="page-actions__btn" data-page-actions-copy data-md-src="${escapeAttr(mdRoute)}" aria-label="Copy as Markdown" hidden>Copy as Markdown</button>
<a class="page-actions__btn" href="${escapeAttr(claudeHref)}" target="_blank" rel="noopener noreferrer">Open in Claude</a>
<a class="page-actions__btn" href="${escapeAttr(chatgptHref)}" target="_blank" rel="noopener noreferrer">Open in ChatGPT</a>
<span class="page-actions__status" role="status" aria-live="polite"></span>
</div>
`;
}
