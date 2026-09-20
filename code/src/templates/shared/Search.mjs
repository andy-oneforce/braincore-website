// Site search (⌘K) — server-rendered trigger + modal shell; search.js does the work.
// Grouping into Docs/Blog/Pages reads each Pagefind hit's `meta.type`, which comes from the
// `data-pagefind-meta="type:..."` attribute the docs/blog/marketing `<main>` tags now carry.

export function renderSearchTrigger() {
  return `<button type="button" class="search-trigger" data-search-trigger aria-haspopup="dialog" aria-controls="search-modal" aria-expanded="false" aria-label="Search">🔍<span class="search-trigger-hint">⌘K</span></button>`;
}

export function renderSearchModal() {
  return `<div class="search-backdrop" id="search-backdrop" hidden></div>
<div class="search-modal" id="search-modal" role="dialog" aria-modal="true" aria-label="Search" hidden>
<div class="search-modal-inner">
<input type="text" class="search-input" id="search-input" placeholder="Search docs, blog, and pages..." autocomplete="off" spellcheck="false" aria-label="Search">
<div class="search-recent" id="search-recent" data-search-recent hidden></div>
<div class="search-results" id="search-results" data-search-results role="listbox" aria-label="Search results"></div>
</div>
</div>`;
}
