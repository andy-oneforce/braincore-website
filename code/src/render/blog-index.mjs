// Blog index generator: scans a blog post source directory, reads frontmatter (title, date, tags,
// slug/route, excerpt) and produces (a) a paginated newest-first listing and (b) a tag index
// (tag -> posts). Mirrors build.mjs's walkMarkdownFiles + gray-matter discovery pattern for docs,
// but stays self-contained (no import of build.mjs) since build.mjs imports this module.
// A missing postsDir is a site with no blog yet, not an error — every function below returns the
// same empty-but-valid shape a real empty posts folder would produce.

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { validateBlogFrontmatter } from '../../frontmatter.mjs';

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

// One post's listing/tag-index summary — frontmatter only, no rendered body. build.mjs's own
// buildBlog() owns full post-page HTML from the same source file.
async function readPostSummary(file) {
  const raw = await fs.readFile(file, 'utf8');
  const { data } = matter(raw);
  validateBlogFrontmatter(data, file);
  const slug = typeof data.slug === 'string' && data.slug.trim() ? data.slug.trim() : path.basename(file, '.md');
  return {
    title: data.title,
    date: data.date,
    tags: Array.isArray(data.tags) ? data.tags : [],
    slug,
    route: `/blog/${slug}/`,
    excerpt: data.excerpt || data.description || '',
    sourceFile: file,
  };
}

export function sortPostsNewestFirst(posts) {
  return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Same page-size/URL convention as the site's existing listing: page 1 at /blog/, pages 2+ at
// /blog/page/N/; a 0-post site still gets one (empty) page 1, never zero pages.
export function paginatePosts(posts, pageSize) {
  const totalPosts = posts.length;
  const totalPages = Math.max(1, Math.ceil(totalPosts / pageSize));
  const pages = [];
  for (let pageNum = 1; pageNum <= totalPages; pageNum += 1) {
    pages.push({
      pageNum,
      totalPages,
      urlPath: pageNum === 1 ? '/blog/' : `/blog/page/${pageNum}/`,
      posts: posts.slice((pageNum - 1) * pageSize, pageNum * pageSize),
    });
  }
  return { pages, totalPages, totalPosts };
}

// tag -> posts carrying that tag, each list newest-first (same order as the full listing).
// An untagged post (tags: []) contributes to no tag.
export function buildTagIndex(posts) {
  const tagIndex = {};
  for (const post of posts) {
    for (const tag of post.tags) {
      if (!tagIndex[tag]) tagIndex[tag] = [];
      tagIndex[tag].push(post);
    }
  }
  return tagIndex;
}

// URL-safe form of a tag name for its route segment, e.g. "Release Notes" -> "release-notes".
export function slugifyTag(tag) {
  return String(tag)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// One paginated listing per tag, same page-1-vs-page-N/ URL convention as the main listing but
// nested under /blog/tags/<slug>/. Sorted by tag name so build output order is deterministic.
export function buildTagPages(tagIndex, pageSize) {
  return Object.keys(tagIndex)
    .sort()
    .map((tag) => {
      const slug = slugifyTag(tag);
      const base = `/blog/tags/${slug}/`;
      const { pages, totalPages, totalPosts } = paginatePosts(tagIndex[tag], pageSize);
      return {
        tag,
        slug,
        totalPages,
        totalPosts,
        pages: pages.map((page) => ({
          ...page,
          urlPath: page.pageNum === 1 ? base : `${base}page/${page.pageNum}/`,
        })),
      };
    });
}

// Full pipeline: discover -> parse -> sort -> paginate -> tag-index -> per-tag pagination.
// Returns the no-op shape (0 posts, 1 empty page, {} tags, [] tagPages) when postsDir does not
// exist yet.
export async function generateBlogIndex(postsDir, { pageSize = 10 } = {}) {
  const files = await walkMarkdownFiles(postsDir);
  const posts = sortPostsNewestFirst(await Promise.all(files.map(readPostSummary)));
  const { pages, totalPages, totalPosts } = paginatePosts(posts, pageSize);
  const tagIndex = buildTagIndex(posts);
  const tagPages = buildTagPages(tagIndex, pageSize);
  return { posts, pages, totalPages, totalPosts, tagIndex, tagPages, pageSize };
}

// JSON-serializable projection for a future template or API consumer — drops sourceFile (a local
// filesystem path, not something to ship).
export function toJSON(index) {
  const strip = ({ sourceFile, ...rest }) => rest;
  return {
    totalPosts: index.totalPosts,
    totalPages: index.totalPages,
    pageSize: index.pageSize,
    posts: index.posts.map(strip),
    tags: Object.fromEntries(
      Object.entries(index.tagIndex).map(([tag, taggedPosts]) => [tag, taggedPosts.map(strip)])
    ),
  };
}
