// Shared 404 page (Phase 6 step 6.5) — reuses the site header/footer and tokens so a broken link
// still lands in the site chrome. Not a template kind in build.mjs's docs/marketing/blog sense: it
// is a single static page built once, at the fixed dist/404.html path Cloudflare Pages serves for
// any unmatched route. `noindex` because a 404 has nothing worth a search engine indexing; there is
// no search route yet, so the only way back out is the Home link.

import { renderHead, renderAnalytics } from '../render/head.mjs';
import { renderHeader } from './shared/Header.mjs';
import { renderFooter } from './shared/Footer.mjs';

export function renderNotFoundPage() {
  const urlPath = '/404.html';
  const title = 'Page not found';
  const description = "The page you're looking for doesn't exist or has moved.";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
${renderHead({ title, description, urlPath, ogType: 'website' })}
<link rel="stylesheet" href="/styles/tokens.css">
<link rel="stylesheet" href="/styles/base.css">
${renderAnalytics()}
</head>
<body class="not-found-page">
${renderHeader({ urlPath })}
<main class="not-found">
<h1>Page not found</h1>
<p class="not-found__body">${description}</p>
<a class="not-found__home" href="/">Back to home</a>
</main>
${renderFooter()}
</body>
</html>
`;
}
