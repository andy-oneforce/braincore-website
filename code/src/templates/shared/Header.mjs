import { renderThemeToggle } from './ThemeToggle.mjs';
import { renderSearchTrigger, renderSearchModal } from './Search.mjs';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Space variant beside the logo — static HTML/CSS, no JS.
// - spaceSwitcher: `{ spaces: [{ title, href, current }] }` or null. No spaces (or null) renders
//   nothing, so no-arg call sites (marketing/blog) stay byte-identical. One space renders a plain
//   `<span class="space-title">` (a label, not a control). 2+ spaces render a `<details>` dropdown
//   whose items are ordinary links to each space's first page — that page renders its own
//   space's sidebar, so "switching space swaps the sidebar" with no script. The current space
//   carries `aria-current="true"`; the summary shows its title.
function renderSpaceVariant(spaceSwitcher) {
  const spaces = Array.isArray(spaceSwitcher?.spaces) ? spaceSwitcher.spaces : [];
  if (spaces.length === 0) return '';
  if (spaces.length === 1) return `<span class="space-title">${escapeHtml(spaces[0].title)}</span>`;
  const current = spaces.find((space) => space.current) || spaces[0];
  const items = spaces
    .map((space) => {
      const aria = space.current ? ' aria-current="true"' : '';
      return `<li><a href="${escapeHtml(space.href)}"${aria}>${escapeHtml(space.title)}</a></li>`;
    })
    .join('');
  return `<details class="space-switcher"><summary>${escapeHtml(current.title)}</summary><ul>${items}</ul></details>`;
}

export function renderHeader({ urlPath = '/', showDrawerToggle = false, spaceSwitcher = null } = {}) {
  const drawerToggle = showDrawerToggle
    ? '<button type="button" class="drawer-toggle" id="drawer-toggle" aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="sidebar">☰</button>'
    : '';
  return `<header class="site-header">${drawerToggle}<a class="site-logo" href="/">ASIOS</a>${renderSpaceVariant(spaceSwitcher)}<nav class="site-nav"><a href="/">Home</a><a href="/pricing/">Pricing</a><a href="/blog">Blog</a></nav>${renderSearchTrigger()}${renderThemeToggle()}</header>${renderSearchModal()}`;
}
