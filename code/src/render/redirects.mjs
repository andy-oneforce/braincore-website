// Collects `redirect_from:` frontmatter across docs/marketing/blog pages, validates it, and
// formats dist/_redirects in Cloudflare Pages format (`old-path new-path 301` per line).

// Normalizes one redirect_from value to a site-absolute path: leading slash required, surrounding
// whitespace trimmed. No other rewriting — the build's own urlPaths already carry whatever
// extension/trailing-slash shape each template kind uses, and `from` must be compared as-is.
function normalizePath(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

// Flattens each page's `data.redirect_from` (absent | string | string[]) into
// `{ from, to, sourceFile }` rows. `to` is the page's own already-built urlPath.
export function collectRedirectEntries(pages) {
  const entries = [];
  for (const { data, urlPath, sourceFile } of pages) {
    const raw = data?.redirect_from;
    if (raw === undefined || raw === null) continue;
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      if (typeof value !== 'string') {
        throw new Error(`${sourceFile}: frontmatter field "redirect_from" must be a string or array of strings`);
      }
      const from = normalizePath(value);
      if (!from) {
        throw new Error(`${sourceFile}: frontmatter field "redirect_from" has an empty value`);
      }
      entries.push({ from, to: urlPath, sourceFile });
    }
  }
  return entries;
}

// Validates the flattened entries against each other and against the set of routes the build
// actually produced. Throws with a clear, file-attributed message on the first conflict found.
// - duplicate: the same `from` value declared more than once (same or different page)
// - loop: a `from` value equal to its own page's `to` (redirects a page to itself)
// - collision: a `from` value equal to a DIFFERENT page's real, already-built route
export function validateRedirectEntries(entries, existingRoutes) {
  const seenFrom = new Map(); // from -> first entry that declared it
  for (const entry of entries) {
    const prior = seenFrom.get(entry.from);
    if (prior) {
      throw new Error(
        `redirect_from conflict: "${entry.from}" is declared by both ${prior.sourceFile} and ${entry.sourceFile}`
      );
    }
    seenFrom.set(entry.from, entry);
    if (entry.from === entry.to) {
      throw new Error(
        `redirect_from loop: ${entry.sourceFile} declares redirect_from "${entry.from}", which is its own page's route`
      );
    }
    if (existingRoutes.has(entry.from)) {
      throw new Error(
        `redirect_from collision: ${entry.sourceFile} declares redirect_from "${entry.from}", which is an existing page route`
      );
    }
  }
}

// Formats validated entries as a Cloudflare Pages `_redirects` file: one `old new 301` line per
// entry, sorted by `from` for a deterministic diff. Returns '' for no entries — callers skip the
// write so a site with no redirect_from: anywhere ships no _redirects file at all.
export function formatRedirects(entries) {
  if (entries.length === 0) return '';
  const sorted = [...entries].sort((a, b) => a.from.localeCompare(b.from));
  return sorted.map((entry) => `${entry.from} ${entry.to} 301`).join('\n') + '\n';
}

// Full pipeline: collect -> validate -> format. `pages` is every built page's
// `{ data, urlPath, sourceFile }`; `existingRoutes` is the Set of every urlPath the build produced.
export function buildRedirects(pages, existingRoutes) {
  const entries = collectRedirectEntries(pages);
  validateRedirectEntries(entries, existingRoutes);
  return formatRedirects(entries);
}
