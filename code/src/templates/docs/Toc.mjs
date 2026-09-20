// Docs "On this page" table of contents — static render only (scroll-spy is a later island).
// Two renders of the SAME list from render/toc.mjs, one visible per breakpoint (base.css `.toc`):
//   renderToc         — the right-hand rail, `<nav class="toc" aria-label="On this page">`, a sibling of
//                       `<main>` in `.docs-frame`;
//   renderTocDropdown — a `<details class="toc-dropdown">` that opens `<main>` below the tablet break,
//                       where the rail is hidden. It is not a `<nav>`, so the page has one landmark.
// Both return '' when the page has under 2 headings or uses the `landing` layout, so callers can
// interpolate them unconditionally.

const MIN_HEADINGS = 2;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderList(items) {
  const rows = items.map((item) => {
    const link = `<a href="#${escapeHtml(item.id)}" data-level="${item.level}">${escapeHtml(item.text)}</a>`;
    const nested = item.children && item.children.length ? renderList(item.children) : '';
    return `<li>${link}${nested}</li>`;
  });
  return `<ol>${rows.join('')}</ol>`;
}

function isVisible(items, layout) {
  if (layout === 'landing') return false;
  const count = items.reduce((n, item) => n + 1 + (item.children ? item.children.length : 0), 0);
  return count >= MIN_HEADINGS;
}

export function renderToc(items = [], { layout = '' } = {}) {
  if (!isVisible(items, layout)) return '';
  return `<nav class="toc" aria-label="On this page"><p class="toc-title">On this page</p>${renderList(items)}</nav>`;
}

export function renderTocDropdown(items = [], { layout = '' } = {}) {
  if (!isVisible(items, layout)) return '';
  return `<details class="toc-dropdown"><summary>On this page</summary>${renderList(items)}</details>`;
}
