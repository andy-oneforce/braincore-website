import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import matter from 'gray-matter';
import { renderMarkdown } from './markdown.mjs';

import { renderDocsPage } from './src/templates/docs/index.mjs';
import { renderPageNav } from './src/templates/docs/PageNav.mjs';
import { renderMarketingPage } from './src/templates/marketing/index.mjs';
import { validateSections } from './src/templates/marketing/sections-schema.mjs';
import { renderBlogPost } from './src/templates/blog/index.mjs';
import { renderBlogListing } from './src/templates/blog/BlogLayout.mjs';
import { renderRelatedPosts } from './src/templates/blog/RelatedPosts.mjs';
import { extractToc } from './src/render/toc.mjs';
import {
  validateDocsFrontmatter,
  validateMarketingFrontmatter,
  validateBlogFrontmatter,
} from './frontmatter.mjs';
import { validateDocSpaces, findDocSpaces, buildNav } from './nav.mjs';
import { renderSidebar } from './src/templates/docs/Sidebar.mjs';
import { slugFromUrlPath, loadSiteConfig } from './src/render/head.mjs';
import { renderOgImage } from './src/render/og.mjs';
import { processFigureImage } from './src/render/images.mjs';
import { writeSitemapAndRobots } from './src/render/sitemap.mjs';
import { buildRedirects } from './src/render/redirects.mjs';
import { renderNotFoundPage } from './src/templates/NotFound.mjs';
import { generateBlogIndex } from './src/render/blog-index.mjs';

const execFileAsync = promisify(execFile);

const CODE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(CODE_ROOT, '..', 'data', 'asios', 'content');
const DIST_DIR = path.join(CODE_ROOT, '..', 'data', 'asios', 'dist');
// Every built page's { data, urlPath, sourceFile }, collected by buildDocs/buildMarketing/buildBlog
// for main()'s single redirects.mjs pass at the end of the build.
const redirectPages = [];

async function walkMarkdownFiles(dir) {
  const found = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return found;
    throw err;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await walkMarkdownFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      found.push(full);
    }
  }
  return found;
}

// Matches a `figure` container's opening fence + info-string attrs, e.g.
// `:::figure{src="./assets/x.png" alt="..." caption="..."}` — same spirit as parseFenceInfo,
// just scanning raw content ahead of renderMarkdown() since sharp's resize is async and
// md.render() is sync (R03's Shiki-preload precedent).
const FIGURE_BLOCK_RE = /:::+figure\{([^}]*)\}/g;

// Pre-pass: finds every `:::figure{...src="..."}` block in one docs file's raw content,
// resizes that image (+ its `.dark.` sibling, if any) into dist/docs/<same-relative-dir>/assets/
// via images.mjs, and returns the `{ src -> {width,height,hasDark} }` map renderMarkdown()
// needs so registerFigure() can emit real dimensions instead of guessing.
async function collectFigureImageMeta(file, raw, docsDir) {
  const meta = {};
  const rel = path.relative(docsDir, file);
  const destDir = path.join(DIST_DIR, 'docs', path.dirname(rel), 'assets');
  FIGURE_BLOCK_RE.lastIndex = 0;
  let match;
  while ((match = FIGURE_BLOCK_RE.exec(raw))) {
    const srcMatch = match[1].match(/src="([^"]*)"/);
    if (!srcMatch) continue;
    const src = srcMatch[1];
    if (meta[src]) continue;
    const srcPathAbs = path.resolve(path.dirname(file), src);
    try {
      meta[src] = await processFigureImage(srcPathAbs, destDir);
    } catch (err) {
      console.warn(`[figure] skipping missing/unreadable image: ${srcPathAbs} (${err.message})`);
    }
  }
  return meta;
}

async function writeHtml(outFile, html) {
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, html, 'utf8');
}

// Emits the branded OG PNG for one page at the exact dist/og/<slug>.png path head.mjs's
// og:image tag already points to (same slugFromUrlPath convention on both sides).
async function writeOgImage(urlPath, title) {
  const slug = slugFromUrlPath(urlPath);
  const outFile = path.join(DIST_DIR, 'og', `${slug}.png`);
  const png = await renderOgImage({ title });
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, png);
  console.log(`og        -> ${path.relative(CODE_ROOT, outFile)}`);
}

// Ships src/styles/*.css alongside the built site so <link> tags in every template resolve.
async function copyStyles() {
  const stylesSrcDir = path.join(CODE_ROOT, 'src', 'styles');
  const stylesOutDir = path.join(DIST_DIR, 'styles');
  await fs.mkdir(stylesOutDir, { recursive: true });
  const entries = await fs.readdir(stylesSrcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.css')) {
      await fs.copyFile(
        path.join(stylesSrcDir, entry.name),
        path.join(stylesOutDir, entry.name)
      );
      console.log(`styles    -> ${path.relative(CODE_ROOT, path.join(stylesOutDir, entry.name))}`);
    }
  }
}

// Ships src/scripts/*.js alongside the built site so <script> tags in every template resolve.
async function copyScripts() {
  const scriptsSrcDir = path.join(CODE_ROOT, 'src', 'scripts');
  const scriptsOutDir = path.join(DIST_DIR, 'scripts');
  await fs.mkdir(scriptsOutDir, { recursive: true });
  const entries = await fs.readdir(scriptsSrcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.js')) {
      await fs.copyFile(
        path.join(scriptsSrcDir, entry.name),
        path.join(scriptsOutDir, entry.name)
      );
      console.log(`scripts   -> ${path.relative(CODE_ROOT, path.join(scriptsOutDir, entry.name))}`);
    }
  }
}

// Resolves the deepest docs space a file falls under (spaces are directories containing a
// summary.yml; sorting by contentDir length means a nested space wins over an ancestor one).
function findSpaceForFile(spacesByDepth, file) {
  return spacesByDepth.find(
    (space) => file === space.contentDir || file.startsWith(space.contentDir + path.sep)
  );
}

// Lazily builds + caches one space's nav model plus the two lookups Sidebar.mjs needs: a
// page-key -> title map (from buildNav's flat `pages`, so it reflects frontmatter titles) and a
// page-key -> site URL function (built from the space's own position under docsDir).
function makeNavResolver(docsDir) {
  const cache = new Map(); // summaryPath -> { tree, titleFor, hrefFor, pages, spaceTitle, spaceHref }
  return async function navForSpace(space) {
    let entry = cache.get(space.summaryPath);
    if (entry) return entry;
    const nav = await buildNav(space.summaryPath, space.contentDir);
    const titleMap = new Map(nav.pages.map((p) => [p.page, p.title]));
    const relFromDocs = path.relative(docsDir, space.contentDir).split(path.sep).join('/');
    const navBase = '/docs/' + (relFromDocs ? relFromDocs + '/' : '');
    const hrefFor = (pageKey) => navBase + pageKey.replace(/\.md$/, '.html');
    entry = {
      tree: nav.tree,
      titleFor: (pageKey) => titleMap.get(pageKey) || pageKey,
      hrefFor,
      // Flat page-key -> record lookup (carries prev/next/breadcrumb) for breadcrumbs + pager.
      pages: new Map(nav.pages.map((p) => [p.page, p])),
      spaceTitle: nav.title,
      spaceHref: nav.pages.length ? hrefFor(nav.pages[0].page) : null,
    };
    cache.set(space.summaryPath, entry);
    return entry;
  };
}

// Returns the chain of group entries (entries carrying `items`) that lead down to `currentPage`,
// outermost first, excluding the page's own entry. Empty when the page is top-level or absent.
function ancestorGroups(entries, currentPage) {
  for (const entry of entries) {
    if (entry.page === currentPage) return [];
    if (Array.isArray(entry.items)) {
      const below = ancestorGroups(entry.items, currentPage);
      if (below) return [entry, ...below];
    }
  }
  return null;
}

// Builds one page's breadcrumb trail from its space's nav: space title (linked to the space's
// first page) > ancestor group labels (each group is itself a page, so it links) > current page
// (unlinked). An ancestor that resolves to the space crumb's own href is dropped, so a space's
// index page doesn't appear twice.
function buildBreadcrumbTrail(navEntry, currentPage, urlPath) {
  const { tree, titleFor, hrefFor, pages, spaceTitle, spaceHref } = navEntry;
  const record = pages.get(currentPage);
  if (!record) return [];
  const trail = [];
  if (spaceTitle) trail.push({ label: spaceTitle, href: spaceHref });
  for (const group of ancestorGroups(tree, currentPage) || []) {
    const href = hrefFor(group.page);
    if (trail.length && trail[trail.length - 1].href === href) continue;
    trail.push({ label: titleFor(group.page), href });
  }
  trail.push({ label: record.title, href: urlPath });
  return trail;
}

// Template kind 1/3: docs — content/docs/**/*.md -> dist/docs/**/*.html (path-preserving).
// Returns the list of urlPaths it built, so main() can feed them into the sitemap.
async function buildDocs() {
  const docsDir = path.join(CONTENT_DIR, 'docs');
  await validateDocSpaces(docsDir);
  const spaces = await findDocSpaces(docsDir);
  const spacesByDepth = [...spaces].sort((a, b) => b.contentDir.length - a.contentDir.length);
  const navForSpace = makeNavResolver(docsDir);

  // Every space's header entry, computed once: title + first-page URL (the same spaceTitle /
  // spaceHref the breadcrumb trail's space crumb uses). A space with no pages has no target, so
  // it is left out of the switcher.
  const spaceEntries = [];
  for (const space of spaces) {
    const { spaceTitle, spaceHref } = await navForSpace(space);
    if (spaceHref) {
      spaceEntries.push({
        summaryPath: space.summaryPath,
        title: spaceTitle || path.basename(space.contentDir),
        href: spaceHref,
      });
    }
  }

  const files = await walkMarkdownFiles(docsDir);
  const urlPaths = [];
  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const { data, content } = matter(raw);
    validateDocsFrontmatter(data, file);
    const imageMeta = await collectFigureImageMeta(file, raw, docsDir);
    const contentHtml = renderMarkdown(content, imageMeta);
    const rel = path.relative(docsDir, file).replace(/\.md$/, '.html');
    const outFile = path.join(DIST_DIR, 'docs', rel);
    const urlPath = '/' + path.relative(DIST_DIR, outFile).split(path.sep).join('/');
    redirectPages.push({ data, urlPath, sourceFile: file });

    let sidebarHtml = '';
    let breadcrumbTrail = [];
    let pageNavHtml = '';
    let spaceSwitcher = null;
    const space = findSpaceForFile(spacesByDepth, file);
    if (space) {
      spaceSwitcher = {
        spaces: spaceEntries.map(({ summaryPath, title, href }) => ({
          title,
          href,
          current: summaryPath === space.summaryPath,
        })),
      };
      const navEntry = await navForSpace(space);
      const { tree, titleFor, hrefFor, pages } = navEntry;
      const currentPage = path.relative(space.contentDir, file).split(path.sep).join('/');
      sidebarHtml = renderSidebar({ tree, currentPage, titleFor, hrefFor });
      breadcrumbTrail = buildBreadcrumbTrail(navEntry, currentPage, urlPath);
      const record = pages.get(currentPage);
      const toLink = (n) => (n ? { href: hrefFor(n.page), title: titleFor(n.page) } : null);
      if (record) pageNavHtml = renderPageNav({ prev: toLink(record.prev), next: toLink(record.next) });
    }

    const html = renderDocsPage({
      title: data.title || '',
      description: data.description || '',
      contentHtml,
      urlPath,
      sidebarHtml,
      breadcrumbTrail,
      pageNavHtml,
      spaceSwitcher,
      layout: typeof data.layout === 'string' ? data.layout : '',
      sourceFile: file,
    });
    await writeHtml(outFile, html);
    // Raw Markdown twin (frontmatter stripped) at <route>.md — PageActions' copy source. buildBlog joins here when its template gets PageActions.
    await writeHtml(outFile.replace(/\.html$/, '.md'), content);
    console.log(`docs     -> ${path.relative(CODE_ROOT, outFile)}`);
    await writeOgImage(urlPath, data.title || '');
    urlPaths.push(urlPath);
  }
  return urlPaths;
}

// Template kind 2/3: marketing — content/pages/*.md, dispatched by ordered `sections:` list.
// home.md is the site root (dist/index.html); every other page gets a pretty-URL directory.
async function buildMarketing() {
  const pagesDir = path.join(CONTENT_DIR, 'pages');
  const files = await walkMarkdownFiles(pagesDir);
  const urlPaths = [];
  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const { data, content } = matter(raw);
    validateMarketingFrontmatter(data, file);
    validateSections(data.sections, file);
    const contentHtml = content.trim() ? renderMarkdown(content) : '';
    const basename = path.basename(file, '.md');
    const outFile =
      basename === 'home'
        ? path.join(DIST_DIR, 'index.html')
        : path.join(DIST_DIR, basename, 'index.html');
    const urlPath = basename === 'home' ? '/' : `/${basename}/`;
    redirectPages.push({ data, urlPath, sourceFile: file });
    const html = renderMarketingPage({
      title: data.title || '',
      description: data.description || '',
      sections: data.sections || [],
      contentHtml,
      urlPath,
    });
    await writeHtml(outFile, html);
    console.log(`marketing -> ${path.relative(CODE_ROOT, outFile)}`);
    await writeOgImage(urlPath, data.title || '');
    urlPaths.push(urlPath);
  }
  return urlPaths;
}

// Template kind 3/3: blog — content/blog/posts/*.md -> dist/blog/<slug>/index.html, plus the
// paginated listing at dist/blog/index.html (page 1) and dist/blog/page/N/index.html (page N>1).
async function buildBlog() {
  const postsDir = path.join(CONTENT_DIR, 'blog', 'posts');
  const files = await walkMarkdownFiles(postsDir);
  const urlPaths = [];
  // Full post-summary array (title/date/tags/slug/route/…), reusing blog-index.mjs's own
  // discovery/sort rather than re-scanning postsDir a second time — needed up front so each
  // post's own page can compute its "related posts" against every OTHER post.
  const allPosts = (await generateBlogIndex(postsDir, { pageSize: Infinity })).posts;
  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const { data, content } = matter(raw);
    validateBlogFrontmatter(data, file);
    const contentHtml = renderMarkdown(content);
    const slug = path.basename(file, '.md');
    const outFile = path.join(DIST_DIR, 'blog', slug, 'index.html');
    const urlPath = `/blog/${slug}/`;
    redirectPages.push({ data, urlPath, sourceFile: file });
    const toc = extractToc(contentHtml);
    const relatedPostsHtml = renderRelatedPosts(slug, allPosts);
    const html = renderBlogPost({
      title: data.title || '',
      description: data.description || '',
      author: data.author || '',
      date: data.date || '',
      tags: data.tags || [],
      contentHtml,
      urlPath,
      toc,
      relatedPostsHtml,
    });
    await writeHtml(outFile, html);
    console.log(`blog      -> ${path.relative(CODE_ROOT, outFile)}`);
    await writeOgImage(urlPath, data.title || '');
    urlPaths.push(urlPath);
  }

  // blog-index.mjs owns discovery + sort + pagination + the tag index (unused by any template
  // yet — BlogLayout is a later step); it re-scans postsDir itself, so a missing/empty blog
  // content folder no-ops into a single empty page 1 rather than throwing.
  const config = loadSiteConfig();
  const index = await generateBlogIndex(postsDir, { pageSize: config.page_size || 10 });
  for (const page of index.pages) {
    const outFile =
      page.pageNum === 1
        ? path.join(DIST_DIR, 'blog', 'index.html')
        : path.join(DIST_DIR, 'blog', 'page', String(page.pageNum), 'index.html');
    // TagFilter (Phase 5.4, R04) is client-side and lives only on the main /blog/ page 1 listing —
    // pages 2+ and the server-rendered /blog/tags/<slug>/ pages below stay byte-identical to before.
    const isMainIndex = page.pageNum === 1;
    const html = renderBlogListing({
      posts: page.posts.map((post) => ({
        title: post.title || '',
        description: post.excerpt || '',
        date: post.date || '',
        urlPath: post.route,
        ...(isMainIndex ? { tags: post.tags } : {}),
      })),
      pageNum: page.pageNum,
      totalPages: index.totalPages,
      urlPath: page.urlPath,
      ...(isMainIndex ? { tags: Object.keys(index.tagIndex).sort() } : {}),
    });
    await writeHtml(outFile, html);
    console.log(`blog      -> ${path.relative(CODE_ROOT, outFile)}`);
    urlPaths.push(page.urlPath);
  }

  // One paginated listing per tag at /blog/tags/<slug>/ (+ /page/N/ if it overflows a page),
  // reusing the same renderBlogListing template with a "Tag: <name>" heading override.
  for (const tagPage of index.tagPages) {
    for (const page of tagPage.pages) {
      const outFile = path.join(DIST_DIR, ...page.urlPath.split('/').filter(Boolean), 'index.html');
      const html = renderBlogListing({
        posts: page.posts.map((post) => ({
          title: post.title || '',
          description: post.excerpt || '',
          date: post.date || '',
          urlPath: post.route,
        })),
        pageNum: page.pageNum,
        totalPages: tagPage.totalPages,
        urlPath: page.urlPath,
        heading: `Tag: ${tagPage.tag}`,
      });
      await writeHtml(outFile, html);
      console.log(`blog      -> ${path.relative(CODE_ROOT, outFile)}`);
      urlPaths.push(page.urlPath);
    }
  }

  return urlPaths;
}

// Fails the build if any two pages resolve to the same urlPath — a route collision would
// silently overwrite one page's output HTML with another's.
function assertNoDuplicateRoutes(urlPaths) {
  const counts = new Map();
  for (const urlPath of urlPaths) {
    counts.set(urlPath, (counts.get(urlPath) || 0) + 1);
  }
  const duplicates = [...counts.entries()].filter(([, count]) => count > 1).map(([urlPath]) => urlPath);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate route(s) detected: ${duplicates.join(', ')}`);
  }
}

// Runs the installed Pagefind CLI against DIST_DIR as the final build step, so it indexes the
// finished HTML tree (only elements under a `data-pagefind-body` tag — see the template edits
// that added that attribute to each page type's <main>). Fails loud on a nonzero exit, matching
// nav.mjs/frontmatter.mjs.
async function runPagefind() {
  const pagefindBin = path.join(CODE_ROOT, 'node_modules', '.bin', 'pagefind');
  let stdout;
  try {
    ({ stdout } = await execFileAsync(pagefindBin, ['--site', DIST_DIR]));
  } catch (err) {
    throw new Error(`pagefind indexing failed: ${err.message}`);
  }
  const summaryLine = stdout
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  console.log(`pagefind  -> ${summaryLine || path.relative(CODE_ROOT, path.join(DIST_DIR, 'pagefind'))}`);
}

async function main() {
  await copyStyles();
  await copyScripts();
  const docsUrls = await buildDocs();
  const marketingUrls = await buildMarketing();
  const blogUrls = await buildBlog();
  const allUrls = [...docsUrls, ...marketingUrls, ...blogUrls];
  assertNoDuplicateRoutes(allUrls);
  const config = loadSiteConfig();
  await writeSitemapAndRobots(DIST_DIR, allUrls, config.base_url);
  console.log(`sitemap   -> ${path.relative(CODE_ROOT, path.join(DIST_DIR, 'sitemap.xml'))}`);
  console.log(`robots    -> ${path.relative(CODE_ROOT, path.join(DIST_DIR, 'robots.txt'))}`);

  await writeHtml(path.join(DIST_DIR, '404.html'), renderNotFoundPage());
  console.log(`404       -> ${path.relative(CODE_ROOT, path.join(DIST_DIR, '404.html'))}`);

  const redirectsContent = buildRedirects(redirectPages, new Set(allUrls));
  if (redirectsContent) {
    const redirectsFile = path.join(DIST_DIR, '_redirects');
    await fs.writeFile(redirectsFile, redirectsContent, 'utf8');
    console.log(`redirects -> ${path.relative(CODE_ROOT, redirectsFile)}`);
  }

  await runPagefind();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
