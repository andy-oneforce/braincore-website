// sitemap.mjs — writes dist/sitemap.xml + dist/robots.txt for the website-build.
// Called from build.mjs after all 3 template builds (docs/marketing/blog) finish, so it sees
// every urlPath the run produced. Reuses head.mjs's canonicalUrlFor so a sitemap entry always
// matches the <link rel="canonical"> the page itself declares — no second canonicalization rule.

import fs from 'node:fs/promises';
import path from 'node:path';
import { canonicalUrlFor } from './head.mjs';

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Builds well-formed sitemap.xml body, one <url> per urlPath, deduped and in stable order.
export function buildSitemapXml(urlPaths) {
  const seen = new Set();
  const urls = [];
  for (const urlPath of urlPaths) {
    const loc = canonicalUrlFor(urlPath);
    if (seen.has(loc)) continue;
    seen.add(loc);
    urls.push(`  <url>\n    <loc>${escapeXml(loc)}</loc>\n  </url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function buildRobotsTxt(baseUrl) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`;
}

// Writes both files to distDir. urlPaths is the flat list of every page's urlPath from
// buildDocs/buildMarketing/buildBlog, in build order.
export async function writeSitemapAndRobots(distDir, urlPaths, baseUrl) {
  const sitemapXml = buildSitemapXml(urlPaths);
  const robotsTxt = buildRobotsTxt(baseUrl);
  await fs.mkdir(distDir, { recursive: true });
  await fs.writeFile(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf8');
  await fs.writeFile(path.join(distDir, 'robots.txt'), robotsTxt, 'utf8');
}
