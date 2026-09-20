// Blog index/pagination pages — page 1 lives at `basePath`, pages 2+ at `<basePath>page/N/`.
// Same convention for the plain listing (basePath '/blog/') and each tag listing
// (basePath '/blog/tags/<slug>/').
function pageUrlPath(basePath, pageNum) {
  return pageNum <= 1 ? basePath : `${basePath}page/${pageNum}/`;
}

// The current page's own urlPath minus any trailing `page/N/` segment — page 1's own listing
// root, which every other page's prev/next links are built from.
export function baseFromUrlPath(urlPath) {
  return urlPath.replace(/page\/\d+\/$/, '');
}

export function renderPagination(basePath, pageNum, totalPages) {
  if (totalPages <= 1) return '';
  const prevHtml = pageNum > 1 ? `<a rel="prev" href="${pageUrlPath(basePath, pageNum - 1)}">&larr; Newer posts</a>` : '';
  const nextHtml = pageNum < totalPages ? `<a rel="next" href="${pageUrlPath(basePath, pageNum + 1)}">Older posts &rarr;</a>` : '';
  return `<nav class="pager">
${prevHtml}${prevHtml && nextHtml ? '\n' : ''}${nextHtml}
</nav>
`;
}
