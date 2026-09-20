import { slugifyTag } from '../../render/blog-index.mjs';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// `tags` is only ever passed by the main /blog/ listing page (TagFilter, Phase 5.4) — every other
// caller omits it, so its `<li>` carries no `data-tags` attribute and stays byte-identical to
// before this deliverable.
export function renderPostCard({ title = '', description = '', date = '', urlPath = '/', tags = [] }) {
  const dateStr = date ? new Date(date).toISOString().slice(0, 10) : '';
  const tagsAttr = tags.length ? ` data-tags="${escapeHtml(tags.map(slugifyTag).join(','))}"` : '';
  return `<li${tagsAttr}>
<article>
<h2><a href="${escapeHtml(urlPath)}">${escapeHtml(title)}</a></h2>
${dateStr ? `<p class="byline">${escapeHtml(dateStr)}</p>\n` : ''}${description ? `<p class="page-description">${escapeHtml(description)}</p>\n` : ''}</article>
</li>`;
}
