// Head-tag renderer shared by all 3 website-build templates (docs/marketing/blog).
// Reads data/asios/site.config.json for site-wide defaults (base_url, default description/OG image,
// twitter handle) and combines them with a page's own title/description/urlPath to emit an absolute
// canonical link + OG/Twitter meta tags. og:image follows the /og/<slug>.png convention (image itself
// is rendered by C02's og.mjs) — slugFromUrlPath is exported so og.mjs can derive the same filename.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const SITE_CONFIG_PATH = path.join(THIS_DIR, '..', '..', '..', 'data', 'asios', 'site.config.json');

let cachedConfig = null;

export function loadSiteConfig() {
  if (!cachedConfig) {
    cachedConfig = JSON.parse(fs.readFileSync(SITE_CONFIG_PATH, 'utf8'));
  }
  return cachedConfig;
}

// Turns a page's absolute URL path ("/docs/guide/", "/", "/blog/hello-world/") into the slug
// used for its OG image filename — dropping index.html/trailing slashes, "/" -> "home".
export function slugFromUrlPath(urlPath) {
  let p = String(urlPath || '').replace(/^\/+|\/+$/g, '');
  p = p.replace(/index\.html$/, '').replace(/\.html$/, '');
  p = p.replace(/\/+$/g, '');
  if (!p) return 'home';
  return p.replace(/\//g, '-');
}

function absoluteUrl(baseUrl, urlPath) {
  return new URL(urlPath, baseUrl).toString();
}

// Prefers the pretty directory URL ("/docs/guide/") over the literal output file
// ("/docs/guide/index.html") as the canonical target, since both resolve to the same page.
function canonicalPathFrom(urlPath) {
  return String(urlPath || '/').replace(/index\.html$/, '') || '/';
}

// Single source of truth for a page's canonical absolute URL — used by renderHead's
// canonical/OG/Twitter tags and reused as-is by sitemap.mjs so the sitemap never drifts
// from what a page actually declares as canonical.
export function canonicalUrlFor(urlPath) {
  const config = loadSiteConfig();
  return absoluteUrl(config.base_url, canonicalPathFrom(urlPath));
}

function escapeAttr(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// renderAnalytics: emits one cookie-free (Plausible-style) analytics <script> tag when
// config.analytics.enabled is true, using its script_src/data_domain verbatim. Returns ''
// (no tag anywhere in dist/) when disabled — the checked-in default, since no real account
// exists yet.
export function renderAnalytics() {
  const config = loadSiteConfig();
  const analytics = config.analytics || {};
  if (!analytics.enabled) return '';
  return `<script defer data-domain="${escapeAttr(analytics.data_domain)}" src="${escapeAttr(analytics.script_src)}"></script>`;
}

// renderHead: builds <title> + meta description + canonical link + OG + Twitter tags for one page.
// urlPath is the page's site-absolute path (e.g. "/docs/guide/"), used both for the canonical URL
// and (via slugFromUrlPath) the og:image path. ogType is the OG object type ("website" | "article").
export function renderHead({ title = '', description = '', urlPath = '/', ogType = 'website' }) {
  const config = loadSiteConfig();
  const pageTitle = title || config.site_name || '';
  const fullTitle = title && config.site_name ? `${title} | ${config.site_name}` : pageTitle;
  const desc = description || config.default_description || '';
  const canonicalUrl = canonicalUrlFor(urlPath);
  const slug = slugFromUrlPath(urlPath);
  const ogImagePath = `/og/${slug}.png`;
  const ogImageUrl = absoluteUrl(config.base_url, ogImagePath);
  const twitterTag = config.twitter_handle
    ? `\n<meta name="twitter:site" content="${escapeAttr(config.twitter_handle)}">`
    : '';

  return `<title>${escapeAttr(fullTitle)}</title>
<meta name="description" content="${escapeAttr(desc)}">
<link rel="canonical" href="${escapeAttr(canonicalUrl)}">
<meta property="og:title" content="${escapeAttr(pageTitle)}">
<meta property="og:description" content="${escapeAttr(desc)}">
<meta property="og:type" content="${escapeAttr(ogType)}">
<meta property="og:url" content="${escapeAttr(canonicalUrl)}">
<meta property="og:image" content="${escapeAttr(ogImageUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttr(pageTitle)}">
<meta name="twitter:description" content="${escapeAttr(desc)}">
<meta name="twitter:image" content="${escapeAttr(ogImageUrl)}">${twitterTag}`;
}
