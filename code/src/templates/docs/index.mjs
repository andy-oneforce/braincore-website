import { renderHead, renderAnalytics, canonicalUrlFor } from '../../render/head.mjs';
import { renderHeader } from '../shared/Header.mjs';
import { renderFooter } from '../shared/Footer.mjs';
import { renderBreadcrumbs } from './Breadcrumbs.mjs';
import { extractToc } from '../../render/toc.mjs';
import { renderToc, renderTocDropdown } from './Toc.mjs';
import { lastCommitDate, repoPath } from '../../render/git-dates.mjs';
import { loadSiteConfig } from '../../render/head.mjs';
import { renderLastUpdated } from './LastUpdated.mjs';
import { renderEditLink } from './EditLink.mjs';
import { renderPageActions } from './PageActions.mjs';
import { renderFeedback } from './Feedback.mjs';

// BreadcrumbList JSON-LD from the page's own path segments, e.g. "/docs/guide/setup.html" ->
// Docs > Guide > <page title>. Each crumb's item URL reuses canonicalUrlFor() — the same
// canonicalization head.mjs already applies to this page's <link rel="canonical">.
function renderBreadcrumbJsonLd(urlPath, title) {
  const clean = String(urlPath || '/')
    .replace(/index\.html$/, '')
    .replace(/\.html$/, '')
    .replace(/^\/+|\/+$/g, '');
  const segments = clean ? clean.split('/') : [];
  const itemListElement = segments.map((segment, i) => {
    const isLast = i === segments.length - 1;
    const crumbPath = '/' + segments.slice(0, i + 1).join('/') + '/';
    const name = isLast && title ? title : segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: canonicalUrlFor(crumbPath),
    };
  });
  const json = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  };
  return `<script type="application/ld+json">${JSON.stringify(json)}</script>`;
}

// BreadcrumbList JSON-LD from the SAME trail Breadcrumbs.mjs renders visibly, so the visible
// crumbs and the structured data can never disagree. Crumb hrefs resolve to absolute URLs via
// canonicalUrlFor(); the final crumb is the current page, so it uses this page's own urlPath.
function renderTrailJsonLd(trail, urlPath) {
  const lastIndex = trail.length - 1;
  const itemListElement = trail.map((crumb, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: crumb.label,
    item: canonicalUrlFor(i === lastIndex ? urlPath : crumb.href),
  }));
  const json = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  };
  return `<script type="application/ld+json">${JSON.stringify(json)}</script>`;
}

export function renderDocsPage({
  title = '',
  description = '',
  contentHtml = '',
  urlPath = '/',
  sidebarHtml = '',
  breadcrumbTrail = [],
  pageNavHtml = '',
  spaceSwitcher = null,
  layout = '',
  sourceFile = '',
}) {
  // H2/H3 ids are added here (docs path only) so the Toc anchors resolve; `landing` pages get no Toc.
  const toc = extractToc(contentHtml);
  const tocRailHtml = renderToc(toc.items, { layout });
  const tocDropdownHtml = renderTocDropdown(toc.items, { layout });
  // Page footer: last-commit date + "Edit this page" from the source file. Not on `landing` pages.
  // Both halves hang off the file's last commit: a source with no commit (untracked / gitignored)
  // has nothing on the branch to edit, so it gets neither, and the footer is omitted entirely.
  const lastCommit = layout === 'landing' ? null : lastCommitDate(sourceFile);
  const pageMeta = [
    renderLastUpdated(lastCommit),
    renderEditLink(repoPath(sourceFile), loadSiteConfig().edit_link, lastCommit),
  ].filter(Boolean).join('');
  const pageMetaHtml = pageMeta ? `<footer class="page-meta">${pageMeta}</footer>\n` : '';
  // Copy / Open-in actions beside the heading; not on `landing` pages (marketing has its own template).
  const pageActionsHtml = layout === 'landing' ? '' : renderPageActions(urlPath);
  // "Was this page helpful?" vote after the article; posts to the /api/feedback Pages Function. Not on `landing` pages.
  const feedbackHtml = layout === 'landing' ? '' : renderFeedback(urlPath);
  const hasTrail = Array.isArray(breadcrumbTrail) && breadcrumbTrail.length > 0;
  const breadcrumbsHtml = hasTrail ? `${renderBreadcrumbs({ trail: breadcrumbTrail })}\n` : '';
  const breadcrumbJsonLd = hasTrail
    ? renderTrailJsonLd(breadcrumbTrail, urlPath)
    : renderBreadcrumbJsonLd(urlPath, title);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${renderHead({ title, description, urlPath, ogType: 'website' })}
${breadcrumbJsonLd}
<link rel="stylesheet" href="/styles/tokens.css">
<link rel="stylesheet" href="/styles/base.css">
<link rel="stylesheet" href="/styles/blocks.css">
${renderAnalytics()}
</head>
<body class="docs">
${renderHeader({ urlPath, showDrawerToggle: true, spaceSwitcher })}
<div class="docs-frame${tocRailHtml ? ' has-toc' : ''}">
${sidebarHtml}
<main class="docs-content" data-pagefind-body data-pagefind-meta="type:Docs">
${breadcrumbsHtml}<h1 data-pagefind-weight="2" data-pagefind-meta="title">${title}</h1>
${pageActionsHtml}${description ? `<p class="page-description">${description}</p>\n` : ''}${tocDropdownHtml ? `${tocDropdownHtml}\n` : ''}${toc.html}
${feedbackHtml}${pageNavHtml ? `${pageNavHtml}\n` : ''}${pageMetaHtml}</main>
${tocRailHtml ? `${tocRailHtml}\n` : ''}</div>
<div class="drawer-backdrop" id="drawer-backdrop" hidden></div>
${renderFooter()}
<script defer src="/scripts/tabs.js"></script>
<script defer src="/scripts/copy.js"></script>
<script defer src="/scripts/figure-zoom.js"></script>
<script defer src="/scripts/sidebar.js"></script>
<script defer src="/scripts/drawer.js"></script>
<script defer src="/scripts/search.js"></script>
<script defer src="/scripts/toc.js"></script>
<script defer src="/scripts/page-actions.js"></script>
<script defer src="/scripts/feedback.js"></script>
</body>
</html>
`;
}
