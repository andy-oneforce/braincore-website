import { renderHead, renderAnalytics } from '../../render/head.mjs';
import { renderHeader } from '../shared/Header.mjs';
import { renderFooter } from '../shared/Footer.mjs';
import { renderThemeInitScript } from '../shared/ThemeToggle.mjs';
import { renderToc, renderTocDropdown } from '../docs/Toc.mjs';
import { renderAuthorByline } from './AuthorByline.mjs';

// Article JSON-LD from the post's own frontmatter (headline/datePublished/author) — no
// site-config lookup needed since none of these fields depend on base_url.
function renderArticleJsonLd({ title, dateStr, author }) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title || '',
    datePublished: dateStr || '',
    author: { '@type': 'Person', name: author || '' },
  };
  return `<script type="application/ld+json">${JSON.stringify(json)}</script>`;
}

export function renderBlogPost({
  title = '',
  description = '',
  author = '',
  date = '',
  tags = [],
  contentHtml = '',
  urlPath = '/',
  toc = null,
  relatedPostsHtml = '',
}) {
  const dateStr = date ? new Date(date).toISOString().slice(0, 10) : '';
  const tagsHtml = tags.length
    ? `<ul class="tags">${tags.map((tag) => `<li>${tag}</li>`).join('')}</ul>\n`
    : '';
  // toc.html carries the same content with H2/H3 ids injected (see extractToc); fall back to the
  // raw contentHtml when no toc was computed for this page.
  const tocItems = toc && Array.isArray(toc.items) ? toc.items : [];
  const bodyHtml = toc && typeof toc.html === 'string' ? toc.html : contentHtml;
  const tocRailHtml = renderToc(tocItems);
  const tocDropdownHtml = renderTocDropdown(tocItems);
  const tocScript = tocRailHtml || tocDropdownHtml ? '\n<script defer src="/scripts/toc.js"></script>' : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${renderThemeInitScript()}
${renderHead({ title, description, urlPath, ogType: 'article' })}
${renderArticleJsonLd({ title, dateStr, author })}
<link rel="stylesheet" href="/styles/tokens.css">
<link rel="stylesheet" href="/styles/base.css">
${renderAnalytics()}
</head>
<body class="blog-post">
${renderHeader({ urlPath })}
<div class="blog-frame${tocRailHtml ? ' has-toc' : ''}">
<main id="main-content" data-pagefind-body data-pagefind-meta="type:Blog">
<article>
<h1 data-pagefind-weight="2" data-pagefind-meta="title">${title}</h1>
${renderAuthorByline({ author, dateStr })}
${tagsHtml}${tocDropdownHtml ? `${tocDropdownHtml}\n` : ''}${bodyHtml}
</article>
${relatedPostsHtml}</main>
${tocRailHtml ? `${tocRailHtml}\n` : ''}</div>
${renderFooter()}
<script defer src="/scripts/search.js"></script>
<script defer src="/scripts/theme.js"></script>${tocScript}
</body>
</html>
`;
}
