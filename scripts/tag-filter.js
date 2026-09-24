/**
 * ASIOS Website — Blog Listing Tag Filter
 * Progressive enhancement over BlogLayout.mjs's server-rendered `.tag-filter` control group: the
 * "All" + per-tag buttons and each `.post-list` `<li>`'s `data-tags` (comma-separated slugs) are
 * already valid, inert markup without this script. Here: clicking a tag button shows only the
 * `<li>`s whose `data-tags` includes that slug (clicking the active tag again clears back to
 * "All"), keeps `aria-pressed` in sync, and mirrors the selection into the URL as `?tag=<slug>`
 * via `history.pushState` so the back button restores the prior filter and a direct link with
 * `?tag=` pre-applies on load. Only ever present on the main `/blog/` listing page. Plain script,
 * no bundler, same DOMContentLoaded convention as toc.js/page-actions.js, and a separate listener
 * set from both.
 */
document.addEventListener('DOMContentLoaded', () => {
  const filterEl = document.querySelector('[data-tag-filter]');
  const listEl = document.querySelector('[data-post-list]');
  if (!filterEl || !listEl) return;

  const buttons = Array.from(filterEl.querySelectorAll('.tag-filter__btn'));
  const items = Array.from(listEl.querySelectorAll('li'));
  const emptyEl = filterEl.querySelector('[data-tag-filter-empty]');
  if (!buttons.length || !items.length) return;

  function tagsOf(item) {
    const raw = item.getAttribute('data-tags') || '';
    return raw ? raw.split(',') : [];
  }

  function tagFromLocation() {
    return new URLSearchParams(location.search).get('tag') || '';
  }

  function applyFilter(tag) {
    let visible = 0;
    items.forEach((item) => {
      const matches = !tag || tagsOf(item).includes(tag);
      item.hidden = !matches;
      if (matches) visible += 1;
    });
    buttons.forEach((btn) => {
      btn.setAttribute('aria-pressed', String((btn.getAttribute('data-tag') || '') === tag));
    });
    if (emptyEl) emptyEl.hidden = visible > 0;
  }

  // Sets/clears `?tag=` on the current URL and pushes a new history entry, so the back button
  // returns to the filter state that was active before this click.
  function syncUrl(tag) {
    const params = new URLSearchParams(location.search);
    if (tag) params.set('tag', tag);
    else params.delete('tag');
    const query = params.toString();
    const url = `${location.pathname}${query ? `?${query}` : ''}${location.hash}`;
    history.pushState({ tag }, '', url);
  }

  filterEl.addEventListener('click', (event) => {
    const btn = event.target.closest && event.target.closest('.tag-filter__btn');
    if (!btn || !filterEl.contains(btn)) return;
    const tag = btn.getAttribute('data-tag') || '';
    const current = tagFromLocation();
    const next = tag === current ? '' : tag;
    applyFilter(next);
    syncUrl(next);
  });

  // Back/forward: re-read the URL rather than any pushed state object, so a page reload or a
  // history entry from before this script ran still resolves correctly.
  window.addEventListener('popstate', () => {
    applyFilter(tagFromLocation());
  });

  // Direct link with `?tag=<slug>` pre-applies the filter without pushing a new history entry.
  applyFilter(tagFromLocation());
});
