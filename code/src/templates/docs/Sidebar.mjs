// Docs sidebar — static render side only (SidebarItem is folded into the same recursive
// renderer rather than split into its own file; the click/keyboard island lands in a later
// chunk as sidebar.js). Markup matches the User-approved mockup at the activity's
// Output/mockups/doc-page.html: one <div class="group"> per top-level nav entry that carries
// `items`, containing a `.group-label` + `<ul><li><a>`; entries with no `items` render as a
// bare top-level `<a>`. The group containing the current page gets `.group.open`; that page's
// own link gets `.active`.

// True if `entry` (or anything nested under its `items`) is the current page — decides whether
// the group it sits in should render pre-expanded.
function containsCurrentPage(entry, currentPage) {
  if (entry.page === currentPage) return true;
  if (Array.isArray(entry.items)) {
    return entry.items.some((child) => containsCurrentPage(child, currentPage));
  }
  return false;
}

function renderLink(entry, ctx) {
  const { currentPage, titleFor, hrefFor } = ctx;
  const activeClass = entry.page === currentPage ? ' class="active"' : '';
  return `<a href="${hrefFor(entry.page)}"${activeClass}>${titleFor(entry.page)}</a>`;
}

// Renders one nav entry at any depth: a `.group` (label + nested `<ul>`) when it carries
// `items`, otherwise a bare `<a>`.
function renderEntry(entry, ctx) {
  if (!Array.isArray(entry.items) || entry.items.length === 0) {
    return renderLink(entry, ctx);
  }
  const openClass = containsCurrentPage(entry, ctx.currentPage) ? ' open' : '';
  const items = entry.items
    .map((child) => `<li>${renderEntry(child, ctx)}</li>`)
    .join('');
  return `<div class="group${openClass}"><div class="group-label" tabindex="0"><span class="chevron">▸</span> ${ctx.titleFor(entry.page)}</div><ul>${items}</ul></div>`;
}

// Renders a full `<aside class="sidebar">…</aside>` for one docs space.
// - tree: a space's nav tree, as returned by nav.mjs's buildNav() (`{ tree }`).
// - currentPage: the `page:` key (relative to the space's contentDir) of the page being built.
// - titleFor(pageKey): resolves a nav entry's display label (build.mjs supplies this from the
//   same buildNav() call's flat `pages` list, so it reflects each page's frontmatter title).
// - hrefFor(pageKey): resolves a nav entry's site URL (build.mjs supplies this from the space's
//   position under docsDir).
export function renderSidebar({ tree = [], currentPage = '', titleFor, hrefFor } = {}) {
  const ctx = { currentPage, titleFor, hrefFor };
  const body = tree.map((entry) => renderEntry(entry, ctx)).join('');
  return `<aside class="sidebar" id="sidebar">${body}</aside>`;
}
