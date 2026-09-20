// Headings -> nested "On this page" list, extracted from the ALREADY-RENDERED page HTML.
//
// markdown.mjs (markdown-it, no anchor plugin) emits bare `<h2>`/`<h3>` with no ids, and blog/
// marketing pages share that pipeline byte-for-byte — so ids are added HERE, on the docs path only
// (renderDocsPage), never in markdown.mjs. Phase 5.3 (long blog posts) can call the same function.
//
// Pure string work, no DOM: Shiki output and raw-HTML blocks keep `<`/`>` escaped inside code, so a
// literal `<h2>` shown in a code sample cannot match the heading regex below.

const HEADING_RE = /<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/g;
const ID_ATTR_RE = /\sid\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(text) {
  return text.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (whole, dec, hex, name) => {
    if (dec) return String.fromCodePoint(Number(dec));
    if (hex) return String.fromCodePoint(parseInt(hex, 16));
    return NAMED_ENTITIES[name.toLowerCase()] ?? whole;
  });
}

function plainText(innerHtml) {
  return decodeEntities(innerHtml.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

// "Code Blocks" -> "code-blocks". Unicode-aware so non-Latin headings still get a usable id;
// falls back to "section" when nothing survives (e.g. a heading that is only punctuation).
function slugify(text) {
  const slug = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'section';
}

function escapeAttr(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// Returns `{ html, items, count }`:
//   html  — contentHtml with an `id` on every H2/H3 that lacked one (existing ids are kept);
//   items — nested list `[{ id, text, level: 2, children: [{ id, text, level: 3 }] }]`; an H3 with
//           no H2 before it sits at the top level;
//   count — total headings (H2 + H3), which is what Toc.mjs's "under 2 headings" rule tests.
// Duplicate slugs get `-1`, `-2`… (in document order) and never collide with an id already on the page.
export function extractToc(contentHtml) {
  const html = String(contentHtml || '');
  const taken = new Set();
  for (const m of html.matchAll(/\sid\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) taken.add(m[1] ?? m[2]);

  const items = [];
  let current = null;
  let count = 0;
  const out = html.replace(HEADING_RE, (whole, levelStr, attrs = '', inner) => {
    const level = Number(levelStr);
    const text = plainText(inner);
    if (!text) return whole;
    let id;
    let rewritten = whole;
    const existing = ID_ATTR_RE.exec(attrs);
    if (existing) {
      id = existing[1] ?? existing[2];
    } else {
      const base = slugify(text);
      id = base;
      for (let n = 1; taken.has(id); n += 1) id = `${base}-${n}`;
      taken.add(id);
      rewritten = `<h${level}${attrs} id="${escapeAttr(id)}">${inner}</h${level}>`;
    }
    const item = { id, text, level, children: [] };
    if (level === 2 || !current) {
      items.push(item);
      current = level === 2 ? item : null;
    } else {
      current.children.push(item);
    }
    count += 1;
    return rewritten;
  });
  return { html: out, items, count };
}
