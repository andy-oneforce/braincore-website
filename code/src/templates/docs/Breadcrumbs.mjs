// Docs breadcrumb trail — static render only. Matches the User-approved mockup's breadcrumb
// line above the H1 (`Breadcrumb › Section › Page`): an ordered list, one <li> per crumb, with
// the `›` separators drawn in CSS (`.breadcrumbs li + li::before`) so the markup stays a clean
// list for screen readers. Every crumb but the last is a link; the last is the current page.

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// - trail: ordered `[{ label, href }]`; `href` may be null (crumb with no target renders as a
//   plain <span>). The last crumb is always the current page, whatever its href.
// Returns '' for an empty trail so callers can interpolate it unconditionally.
export function renderBreadcrumbs({ trail = [] } = {}) {
  if (!Array.isArray(trail) || trail.length === 0) return '';
  const lastIndex = trail.length - 1;
  const items = trail
    .map((crumb, i) => {
      const label = escapeHtml(crumb.label);
      if (i === lastIndex) {
        return `<li><span aria-current="page">${label}</span></li>`;
      }
      return crumb.href
        ? `<li><a href="${escapeHtml(crumb.href)}">${label}</a></li>`
        : `<li><span>${label}</span></li>`;
    })
    .join('');
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${items}</ol></nav>`;
}
