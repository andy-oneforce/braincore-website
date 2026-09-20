/**
 * ASIOS Website — Site Search (⌘K)
 * Progressive enhancement over Header.mjs's server-rendered trigger + Search.mjs's modal shell:
 * Cmd+K/Ctrl+K or clicking the trigger opens the modal (focus trap, Esc closes — same pattern as
 * drawer.js's sidebar-drawer trap, a SEPARATE keydown listener from it and from sidebar.js's own
 * `.sidebar` arrow-key handler). Pagefind's JS API (`/pagefind/pagefind.js`, shipped by the
 * post-build CLI step in build.mjs) is imported once and lazily, on first use. Results are
 * grouped into Docs/Blog/Pages sections from each hit's `meta.type` (set via the `<main
 * data-pagefind-meta="type:...">` attributes on the docs/blog/marketing templates); anything
 * without a recognized type falls into an Other group. Last 5 queries persist in localStorage
 * and render as clickable chips when the input is empty.
 */
document.addEventListener('DOMContentLoaded', () => {
  const trigger = document.querySelector('[data-search-trigger]');
  const backdrop = document.getElementById('search-backdrop');
  const modal = document.getElementById('search-modal');
  const input = document.getElementById('search-input');
  const recentEl = document.getElementById('search-recent');
  const resultsEl = document.getElementById('search-results');
  if (!trigger || !backdrop || !modal || !input || !recentEl || !resultsEl) return;

  const RECENT_KEY = 'asios-search-recent';
  const RECENT_MAX = 5;
  const GROUP_ORDER = ['Docs', 'Blog', 'Pages', 'Other'];
  const DEBOUNCE_MS = 150;

  let pagefindPromise = null;
  let debounceTimer = null;
  let selectedIndex = -1;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function loadRecent() {
    try {
      const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      return Array.isArray(list) ? list.filter((entry) => typeof entry === 'string') : [];
    } catch {
      return [];
    }
  }

  function saveRecent(term) {
    const trimmed = term.trim();
    if (!trimmed) return;
    const list = [trimmed, ...loadRecent().filter((entry) => entry !== trimmed)].slice(0, RECENT_MAX);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch {
      // localStorage unavailable (private mode, quota) — recent history is best-effort only.
    }
  }

  function renderRecent() {
    const list = loadRecent();
    if (!list.length) {
      recentEl.innerHTML = '';
      recentEl.hidden = true;
      return;
    }
    const chips = list
      .map(
        (term) =>
          `<button type="button" class="search-recent-chip" data-recent-term="${escapeHtml(term)}">${escapeHtml(term)}</button>`
      )
      .join('');
    recentEl.innerHTML = `<p class="search-recent-label">Recent searches</p><div class="search-recent-chips">${chips}</div>`;
    recentEl.hidden = false;
  }

  function resultItems() {
    return Array.from(resultsEl.querySelectorAll('.search-result-item'));
  }

  function clearSelection() {
    selectedIndex = -1;
  }

  function selectIndex(index) {
    const items = resultItems();
    if (!items.length) return;
    const wrapped = ((index % items.length) + items.length) % items.length;
    items.forEach((item) => item.classList.remove('is-selected'));
    items[wrapped].classList.add('is-selected');
    items[wrapped].scrollIntoView({ block: 'nearest' });
    selectedIndex = wrapped;
  }

  async function ensurePagefind() {
    if (!pagefindPromise) {
      pagefindPromise = import('/pagefind/pagefind.js').then(async (mod) => {
        await mod.init();
        return mod;
      });
    }
    return pagefindPromise;
  }

  function groupOf(meta) {
    const type = meta && meta.type;
    return GROUP_ORDER.includes(type) ? type : 'Other';
  }

  function renderResultGroups(groups) {
    clearSelection();
    const sections = GROUP_ORDER.filter((key) => groups[key].length)
      .map((key) => {
        const items = groups[key]
          .map(
            (hit) =>
              `<li class="search-result-item" role="option" data-url="${escapeHtml(hit.url)}"><a href="${escapeHtml(hit.url)}"><span class="search-result-title">${escapeHtml(hit.title || hit.url)}</span><span class="search-result-excerpt">${hit.excerpt || ''}</span></a></li>`
          )
          .join('');
        return `<div class="search-result-group"><h2 class="search-result-group-label">${escapeHtml(key)}</h2><ul>${items}</ul></div>`;
      })
      .join('');
    resultsEl.innerHTML = sections || '<p class="search-no-results">No results</p>';
  }

  async function runSearch(term) {
    if (!term) {
      resultsEl.innerHTML = '';
      renderRecent();
      return;
    }
    recentEl.hidden = true;
    const pagefind = await ensurePagefind();
    const search = await pagefind.search(term);
    const hits = await Promise.all(search.results.slice(0, 20).map((result) => result.data()));
    const groups = { Docs: [], Blog: [], Pages: [], Other: [] };
    hits.forEach((hit) => groups[groupOf(hit.meta)].push(hit));
    renderResultGroups(groups);
    saveRecent(term);
  }

  function scheduleSearch(term) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => runSearch(term.trim()), DEBOUNCE_MS);
  }

  function isOpen() {
    return !modal.hidden;
  }

  function focusableItems() {
    return [input, ...resultItems().map((item) => item.querySelector('a')).filter(Boolean)];
  }

  function openModal() {
    modal.hidden = false;
    backdrop.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    input.value = '';
    resultsEl.innerHTML = '';
    renderRecent();
    input.focus();
  }

  function closeModal() {
    modal.hidden = true;
    backdrop.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  }

  trigger.addEventListener('click', () => {
    if (isOpen()) closeModal();
    else openModal();
  });

  backdrop.addEventListener('click', () => closeModal());

  recentEl.addEventListener('click', (event) => {
    const chip = event.target.closest && event.target.closest('[data-recent-term]');
    if (!chip) return;
    const term = chip.getAttribute('data-recent-term') || '';
    input.value = term;
    input.focus();
    runSearch(term);
  });

  input.addEventListener('input', () => {
    scheduleSearch(input.value);
  });

  document.addEventListener('keydown', (event) => {
    const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    if (isCmdK) {
      event.preventDefault();
      if (isOpen()) closeModal();
      else openModal();
      return;
    }

    if (!isOpen()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectIndex(selectedIndex + 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectIndex(selectedIndex - 1);
      return;
    }

    if (event.key === 'Enter') {
      const items = resultItems();
      if (selectedIndex >= 0 && items[selectedIndex]) {
        event.preventDefault();
        window.location.href = items[selectedIndex].getAttribute('data-url');
      }
      return;
    }

    if (event.key === 'Tab') {
      const items = focusableItems();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !modal.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !modal.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  });
});
