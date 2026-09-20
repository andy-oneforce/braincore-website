// Blog post byline — author + published date, split out of blog/index.mjs so it can be
// reused/tested on its own. `dateStr` is the caller's already-formatted (YYYY-MM-DD) date.

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderAuthorByline({ author = '', dateStr = '' } = {}) {
  return `<p class="byline">${escapeHtml(author)}${author && dateStr ? ' · ' : ''}${dateStr}</p>`;
}
