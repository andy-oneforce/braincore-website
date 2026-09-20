import { renderHead, renderAnalytics } from '../../render/head.mjs';
import { renderHeader } from '../shared/Header.mjs';
import { renderFooter } from '../shared/Footer.mjs';
import { renderPostCard } from './PostCard.mjs';
import { renderPagination, baseFromUrlPath } from './Pagination.mjs';
import { slugifyTag } from '../../render/blog-index.mjs';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// TagFilter (Phase 5.4) controls, server-rendered from the site's known tags so the filter is a
// working (if inert) list of buttons before tag-filter.js runs. build.mjs passes `tags` only for
// the main /blog/ page 1 listing — every other call gets `[]` and this returns '', so pagination
// pages 2+ and the per-tag listings (`/blog/tags/<slug>/`, built server-side by R01) are unaffected.
function renderTagFilter(tags) {
  if (!tags.length) return '';
  const buttonsHtml = tags
    .map(
      (tag) =>
        `<button type="button" class="tag-filter__btn" data-tag="${escapeHtml(slugifyTag(tag))}" aria-pressed="false">${escapeHtml(tag)}</button>`
    )
    .join('\n');
  return `<div class="tag-filter" data-tag-filter>
<span class="tag-filter__label" id="tag-filter-label">Filter by tag</span>
<div class="tag-filter__controls" role="group" aria-labelledby="tag-filter-label">
<button type="button" class="tag-filter__btn tag-filter__btn--all" data-tag="" aria-pressed="true">All</button>
${buttonsHtml}
</div>
<p class="tag-filter__empty" data-tag-filter-empty hidden>No posts match this tag.</p>
</div>
`;
}

export function renderBlogListing({
  posts = [],
  pageNum = 1,
  totalPages = 1,
  urlPath = '/blog/',
  heading = '',
  tags = [],
}) {
  const baseTitle = heading || 'Blog';
  const title = pageNum > 1 ? `${baseTitle} — Page ${pageNum}` : baseTitle;
  const postsHtml = posts.map(renderPostCard).join('\n');
  const tagFilterHtml = renderTagFilter(tags);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${renderHead({ title, description: '', urlPath, ogType: 'website' })}
<link rel="stylesheet" href="/styles/tokens.css">
<link rel="stylesheet" href="/styles/base.css">
${renderAnalytics()}
</head>
<body class="blog-listing">
${renderHeader({ urlPath })}
<main data-pagefind-body data-pagefind-meta="type:Blog">
<h1 data-pagefind-weight="2" data-pagefind-meta="title">${title}</h1>
${tagFilterHtml}<ul class="post-list" data-post-list>
${postsHtml}
</ul>
${renderPagination(baseFromUrlPath(urlPath), pageNum, totalPages)}</main>
${renderFooter()}
<script defer src="/scripts/search.js"></script>
${tagFilterHtml ? '<script defer src="/scripts/tag-filter.js"></script>\n' : ''}</body>
</html>
`;
}
