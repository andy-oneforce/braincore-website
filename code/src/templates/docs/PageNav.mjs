// Docs previous/next pager — static render only. Sits at the bottom of `<main class="docs-content">`,
// after the page body. Each side is a card link with a small label line (`Previous` / `Next`) over
// the target page's title. A page with only one neighbour (first or last page of a space) renders
// only that link — never an empty placeholder anchor — and `.page-nav-next`'s `margin-left:auto`
// keeps a lone "next" card on the right.

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLink(kind, label, { href, title }) {
  return (
    `<a class="page-nav-${kind}" rel="${kind}" href="${escapeHtml(href)}">` +
    `<span class="page-nav-label">${label}</span>` +
    `<span class="page-nav-title">${escapeHtml(title)}</span></a>`
  );
}

// - prev / next: `{ href, title }` or null. Returns '' when both are null (single-page space) so
//   callers can interpolate it unconditionally.
export function renderPageNav({ prev = null, next = null } = {}) {
  const links = [];
  if (prev && prev.href) links.push(renderLink('prev', 'Previous', prev));
  if (next && next.href) links.push(renderLink('next', 'Next', next));
  if (links.length === 0) return '';
  return `<nav class="page-nav" aria-label="Pager">${links.join('')}</nav>`;
}
