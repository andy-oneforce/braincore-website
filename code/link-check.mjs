// link-check.mjs — Internal link + in-page anchor checker over the built dist/ tree.
//
// [[260908-015-activity]] R03, step 8.3 of [[260907-009-gitbook-website-build-recommendation]] §6.
// Walks every *.html file in ../data/asios/dist, extracts href="…"/src="…" references, and resolves
// each site-root-absolute ("/foo") or document-relative ("./foo", "foo") reference against the dist
// tree — a path with no file extension that resolves to a directory is checked for an index.html
// inside it, matching how a static host serves a directory route. A "#fragment" (bare, or trailing
// a resolved path) is checked against the target page's own id/name attributes. Anything carrying a
// URI scheme (http:, https:, mailto:, tel:, javascript:, …) or a protocol-relative "//" is external
// and is skipped entirely — this script never touches or reports on external links.
//
// Usage: node link-check.mjs   (build.mjs must have already produced ../data/asios/dist)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CODE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(CODE_ROOT, '..', 'data', 'asios', 'dist');

const REF_ATTR_RE = /\s(?:href|src)="([^"]*)"/g;
const ID_ATTR_RE = /\s(?:id|name)="([^"]*)"/g;
const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

function listHtmlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listHtmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function isExternal(rawHref) {
  if (rawHref === '' || rawHref.startsWith('#')) return false;
  if (rawHref.startsWith('//')) return true;
  return SCHEME_RE.test(rawHref);
}

function extractIds(html) {
  const ids = new Set();
  let match;
  ID_ATTR_RE.lastIndex = 0;
  while ((match = ID_ATTR_RE.exec(html)) !== null) ids.add(match[1]);
  return ids;
}

// Resolves a non-external href against the dist tree from the page that referenced it.
// Returns { resolvedFile: string|null, ok: boolean } — resolvedFile is the on-disk HTML file to
// check the fragment against (only set when the target itself is an HTML page).
function resolveTarget(rawHref, fromFile) {
  const hashIndex = rawHref.indexOf('#');
  const pathPart = hashIndex === -1 ? rawHref : rawHref.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? null : rawHref.slice(hashIndex + 1);

  if (pathPart === '') {
    // Bare "#fragment" — the page itself is the target.
    return { resolvedFile: fromFile, fragment, ok: true, resolvedPath: fromFile };
  }

  const queryIndex = pathPart.indexOf('?');
  const cleanPath = queryIndex === -1 ? pathPart : pathPart.slice(0, queryIndex);

  const base = cleanPath.startsWith('/') ? DIST_DIR : path.dirname(fromFile);
  let resolved = path.normalize(path.join(base, cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath));

  if (!resolved.startsWith(DIST_DIR)) {
    return { resolvedFile: null, fragment, ok: false, resolvedPath: resolved };
  }

  let stat;
  try {
    stat = fs.statSync(resolved);
  } catch {
    stat = null;
  }

  if (stat?.isDirectory()) {
    const indexFile = path.join(resolved, 'index.html');
    if (fs.existsSync(indexFile)) {
      return { resolvedFile: indexFile, fragment, ok: true, resolvedPath: indexFile };
    }
    return { resolvedFile: null, fragment, ok: false, resolvedPath: resolved };
  }

  if (stat?.isFile()) {
    const resolvedFile = resolved.endsWith('.html') ? resolved : null;
    return { resolvedFile, fragment, ok: true, resolvedPath: resolved };
  }

  return { resolvedFile: null, fragment, ok: false, resolvedPath: resolved };
}

function relDist(p) {
  return path.relative(DIST_DIR, p) || '.';
}

function main() {
  const files = listHtmlFiles(DIST_DIR).sort();
  const idCache = new Map();
  const getIds = (file) => {
    if (!idCache.has(file)) {
      idCache.set(file, fs.existsSync(file) ? extractIds(fs.readFileSync(file, 'utf8')) : null);
    }
    return idCache.get(file);
  };

  let checked = 0;
  let broken = 0;
  const failures = [];

  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    REF_ATTR_RE.lastIndex = 0;
    let match;
    while ((match = REF_ATTR_RE.exec(html)) !== null) {
      const rawHref = match[1];
      if (isExternal(rawHref)) continue;
      checked += 1;

      const { resolvedFile, fragment, ok, resolvedPath } = resolveTarget(rawHref, file);
      if (!ok) {
        broken += 1;
        failures.push(`${relDist(file)}: "${rawHref}" -> no such path (${relDist(resolvedPath)})`);
        continue;
      }

      if (fragment !== null && fragment !== '') {
        if (!resolvedFile) {
          // Fragment on a non-HTML target (e.g. an image) can never resolve.
          broken += 1;
          failures.push(`${relDist(file)}: "${rawHref}" -> target is not an HTML page, fragment "#${fragment}" cannot resolve`);
          continue;
        }
        const ids = getIds(resolvedFile);
        if (!ids || !ids.has(fragment)) {
          broken += 1;
          failures.push(`${relDist(file)}: "${rawHref}" -> no id/name="${fragment}" in ${relDist(resolvedFile)}`);
        }
      }
    }
  }

  console.log(`link-check: ${files.length} pages, ${checked} internal links/anchors checked, ${broken} broken`);
  if (failures.length > 0) {
    console.log('');
    for (const line of failures) console.log(`  BROKEN: ${line}`);
  }

  process.exit(broken > 0 ? 1 : 0);
}

main();
