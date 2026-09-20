// "Related posts" block for a blog post page: posts sharing at least one tag with the current
// post, newest-first, capped at `max`, always excluding the current post itself. No fallback —
// a post with no tags, or no tag shared with any other post, renders no section at all.

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function renderRelatedPosts(currentSlug, allPosts = [], { max = 3 } = {}) {
  const posts = Array.isArray(allPosts) ? allPosts : [];
  const current = posts.find((post) => post.slug === currentSlug);
  const currentTags = current && Array.isArray(current.tags) ? current.tags : [];
  if (!currentTags.length) return '';
  const others = posts.filter((post) => post.slug !== currentSlug);
  const newestFirst = [...others].sort((a, b) => new Date(b.date) - new Date(a.date));
  const picks = newestFirst
    .filter((post) => Array.isArray(post.tags) && post.tags.some((tag) => currentTags.includes(tag)))
    .slice(0, max);
  if (!picks.length) return '';
  const items = picks
    .map((post) => `<li><a href="${escapeAttr(post.route)}">${escapeHtml(post.title)}</a></li>`)
    .join('');
  return `<aside class="related-posts"><h2>Related posts</h2><ul>${items}</ul></aside>`;
}
