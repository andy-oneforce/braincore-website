// Docs-space navigation: parses a space's summary.yml, builds an ordered nav tree, computes
// linear prev/next + breadcrumbs, and validates every `page:` entry resolves to a real file.
// Same fail-loudly convention as frontmatter.mjs — throws an Error naming both the bad value
// and the file it came from.

import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import matter from 'gray-matter';

// Depth-first walk of the `nav:` list, preserving the tree (for future nested rendering) while
// also returning a flat, linear ordering — the sequence prev/next and breadcrumbs are built from.
function flattenNavEntries(entries, summaryPath, acc) {
  if (!Array.isArray(entries)) return acc;
  for (const entry of entries) {
    if (!entry || typeof entry.page !== 'string' || entry.page.trim() === '') {
      throw new Error(
        `${summaryPath}: nav entry is missing a required "page" field (${JSON.stringify(entry)})`
      );
    }
    acc.push(entry);
    if (entry.items !== undefined) {
      flattenNavEntries(entry.items, summaryPath, acc);
    }
  }
  return acc;
}

// Loads + parses one space's summary.yml, validates every listed page exists on disk under
// contentDir, and returns the nav model: the raw tree, the linear page list (each carrying
// prev/next + a breadcrumb trail), and the space title.
export async function buildNav(summaryPath, contentDir) {
  let raw;
  try {
    raw = await fs.readFile(summaryPath, 'utf8');
  } catch (err) {
    throw new Error(`${summaryPath}: could not read summary.yml (${err.message})`);
  }

  let manifest;
  try {
    manifest = yaml.load(raw);
  } catch (err) {
    throw new Error(`${summaryPath}: could not parse YAML (${err.message})`);
  }
  if (!manifest || typeof manifest !== 'object') {
    throw new Error(`${summaryPath}: must be a YAML mapping with "title" and "nav"`);
  }

  const spaceTitle = typeof manifest.title === 'string' ? manifest.title : '';
  const tree = Array.isArray(manifest.nav) ? manifest.nav : [];
  const flatEntries = flattenNavEntries(tree, summaryPath, []);

  const pages = [];
  for (const entry of flatEntries) {
    const filePath = path.join(contentDir, entry.page);
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(
        `${summaryPath}: nav entry "page: ${entry.page}" has no matching file at ${filePath}`
      );
    }
    const pageRaw = await fs.readFile(filePath, 'utf8');
    const { data } = matter(pageRaw);
    const title = typeof data.title === 'string' && data.title.trim() ? data.title : entry.page;
    pages.push({ page: entry.page, filePath, title });
  }

  pages.forEach((p, i) => {
    p.prev = i > 0 ? { page: pages[i - 1].page, title: pages[i - 1].title } : null;
    p.next = i < pages.length - 1 ? { page: pages[i + 1].page, title: pages[i + 1].title } : null;
    p.breadcrumb = [spaceTitle, p.title].filter((part) => part && part.trim() !== '');
  });

  return { title: spaceTitle, tree, pages };
}

// Finds every docs space under docsDir — any directory (docsDir itself, or one of its
// subdirectories) that contains a summary.yml.
export async function findDocSpaces(docsDir) {
  const spaces = [];
  async function scan(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') return;
      throw err;
    }
    const hasSummary = entries.some((e) => e.isFile() && e.name === 'summary.yml');
    if (hasSummary) {
      spaces.push({ summaryPath: path.join(dir, 'summary.yml'), contentDir: dir });
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await scan(path.join(dir, entry.name));
      }
    }
  }
  await scan(docsDir);
  return spaces;
}

// Validates every docs space found under docsDir — called from build.mjs's docs-build step so a
// bad summary.yml entry fails `node build.mjs` loudly (exit 1) before any HTML is written.
export async function validateDocSpaces(docsDir) {
  const spaces = await findDocSpaces(docsDir);
  for (const space of spaces) {
    await buildNav(space.summaryPath, space.contentDir);
  }
  return spaces;
}
