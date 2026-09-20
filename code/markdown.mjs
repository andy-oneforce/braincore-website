import MarkdownIt from 'markdown-it';
import container from 'markdown-it-container';
import footnote from 'markdown-it-footnote';
import { createHighlighter } from 'shiki';

// Code-block themes: dual light/dark via Shiki's `defaultColor: false` CSS-variable
// output (shiki.style's documented approach) — every token gets `--shiki-light`/
// `--shiki-dark` custom properties instead of one baked-in `color`, so C02's CSS can
// switch on this project's own `[data-theme="dark"]` attribute with no new tokens.
const SHIKI_THEMES = { light: 'github-light', dark: 'github-dark' };
// Preloaded synchronously so the `fence` override below can stay a sync markdown-it
// rule (md.render() itself is sync) — anything outside this list falls back to
// 'plaintext', which Shiki always supports without loading.
const SHIKI_LANGS = [
  'javascript', 'typescript', 'jsx', 'tsx', 'json', 'css', 'html',
  'bash', 'shell', 'python', 'yaml', 'markdown', 'sql', 'diff',
];
const highlighter = await createHighlighter({
  themes: Object.values(SHIKI_THEMES),
  langs: SHIKI_LANGS,
});
const LOADED_LANGS = new Set(highlighter.getLoadedLanguages());

// github-light's parameter-token orange (#E36209 on white --code-bg) measures 3.49:1,
// below AA's 4.5:1 for normal text (axe-core color-contrast, [[260908-015-plan]] R01,
// docs/guide/style-guide.html). No per-scope override hook exists in Shiki's theme API
// for a single already-shipped theme, so the token color is remapped post-render; every
// other github-light/github-dark token color already clears 4.5:1 (checked across all
// built pages) and is left untouched.
const SHIKI_LIGHT_CONTRAST_FIXES = { '#E36209': '#C2410C' };

function fixShikiContrast(html) {
  let out = html;
  for (const [from, to] of Object.entries(SHIKI_LIGHT_CONTRAST_FIXES)) {
    out = out.split(`--shiki-light:${from}`).join(`--shiki-light:${to}`);
  }
  return out;
}

const COPY_ICON_SVG =
  '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">' +
  '<path fill="currentColor" d="M4 1.5A1.5 1.5 0 0 1 5.5 0h6A1.5 1.5 0 0 1 13 1.5v9A1.5 1.5 0 0 1 11.5 12h-6A1.5 1.5 0 0 1 4 10.5v-9Zm1.5-.5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-6ZM2 4a.5.5 0 0 1 .5.5V14a.5.5 0 0 0 .5.5h7a.5.5 0 0 1 0 1H3A1.5 1.5 0 0 1 1.5 14V4.5A.5.5 0 0 1 2 4Z"/>' +
  '</svg>';

// Parses a fence info string: `js title="Example" {2-4,7}` -> lang/title/highlightLines.
// Same attribute-suffix spirit as `parseAttrs` above, but fence info is
// `<lang> [title="..."] [{ranges}]`, not a container's `{key="value"}` block.
function parseFenceInfo(info) {
  const trimmed = info.trim();
  const langMatch = trimmed.match(/^(\S+)/);
  const lang = langMatch ? langMatch[1] : '';
  const rest = trimmed.slice(lang.length);
  const titleMatch = rest.match(/title="([^"]*)"/);
  const title = titleMatch ? titleMatch[1] : '';
  const rangeMatch = rest.match(/\{([\d,\s-]+)\}/);
  const highlightLines = new Set();
  if (rangeMatch) {
    for (const part of rangeMatch[1].split(',')) {
      const piece = part.trim();
      if (!piece) continue;
      const bounds = piece.split('-').map((n) => parseInt(n, 10));
      if (bounds.length === 2 && !Number.isNaN(bounds[0]) && !Number.isNaN(bounds[1])) {
        for (let n = bounds[0]; n <= bounds[1]; n += 1) highlightLines.add(n);
      } else if (!Number.isNaN(bounds[0])) {
        highlightLines.add(bounds[0]);
      }
    }
  }
  return { lang, title, highlightLines };
}

// Diff convention: a line whose first character is literally `+` or `-` is a
// diff add/remove line — that marker character is stripped before the code
// reaches Shiki, so it never appears in the highlighted output or the copied
// text, only as a line-level class from the `line` transformer below.
function extractDiffLines(rawContent) {
  const lines = rawContent.replace(/\n$/, '').split('\n');
  const diffAdd = new Set();
  const diffRemove = new Set();
  const stripped = lines.map((line, i) => {
    const lineNo = i + 1;
    if (line.startsWith('+')) {
      diffAdd.add(lineNo);
      return line.slice(1);
    }
    if (line.startsWith('-')) {
      diffRemove.add(lineNo);
      return line.slice(1);
    }
    return line;
  });
  return { code: stripped.join('\n'), diffAdd, diffRemove };
}

function resolveLang(lang) {
  if (!lang) return 'plaintext';
  return LOADED_LANGS.has(lang) ? lang : 'plaintext';
}

function highlightFence(token) {
  const { lang, title, highlightLines } = parseFenceInfo(token.info || '');
  const { code, diffAdd, diffRemove } = extractDiffLines(token.content);
  const html = fixShikiContrast(highlighter.codeToHtml(code, {
    lang: resolveLang(lang),
    themes: SHIKI_THEMES,
    defaultColor: false,
    transformers: [
      {
        line(node, line) {
          if (highlightLines.has(line)) this.addClassToHast(node, 'is-highlighted');
          if (diffAdd.has(line)) this.addClassToHast(node, 'is-diff-add');
          if (diffRemove.has(line)) this.addClassToHast(node, 'is-diff-remove');
        },
      },
    ],
  }));
  const headerText = md.utils.escapeHtml(title || lang || '');
  const plainCode = md.utils.escapeHtml(code);
  return (
    '<div class="block-code">\n' +
    '<div class="block-code__header">' +
    `<span class="block-code__lang">${headerText}</span>` +
    `<button type="button" class="block-code__copy" data-code="${plainCode}" aria-label="Copy code">${COPY_ICON_SVG}</button>` +
    '</div>\n' +
    html +
    '\n</div>\n'
  );
}

// Nesting convention: an outer container that wraps named children (`tabs`,
// `stepper`, `cards`) needs a LONGER `:` fence than its children (`tab`,
// `step`, `card`), which in turn need a longer fence than anything nested
// inside them (e.g. a `hint`) — markdown-it-container's forward scan for
// "where does my content end" is a same-length line match, so a same-length
// child closing fence is misread as the parent's own close. Minimum fence
// length is 3. Example: `:::::stepper` > `::::step` > `:::hint`.

// Parses the `{key="value" ...}` attribute suffix off a container's info string,
// e.g. `hint{type="warning"}` -> { type: 'warning' }. Bare `hint` -> {}.
function parseAttrs(info, name) {
  const rest = info.trim().slice(name.length).trim();
  const match = rest.match(/^\{([^}]*)\}/);
  const attrs = {};
  if (!match) return attrs;
  const attrRe = /([\w-]+)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = attrRe.exec(match[1]))) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

// Registers one `:::name ... :::` container transform. `open`/`close` return
// the raw HTML wrapper strings; `open` receives the parsed attrs + the md
// instance (for escaping).
function registerContainer(md, { name, open, close }) {
  md.use(container, name, {
    validate(params) {
      const trimmed = params.trim();
      return (
        trimmed === name ||
        trimmed.startsWith(`${name}{`) ||
        trimmed.startsWith(`${name} `)
      );
    },
    render(tokens, idx) {
      const token = tokens[idx];
      if (token.nesting === 1) {
        return open(parseAttrs(token.info, name), md);
      }
      return close();
    },
  });
}

const HINT_TYPES = ['info', 'success', 'warning', 'danger'];

function registerHint(md) {
  registerContainer(md, {
    name: 'hint',
    open: (attrs) => {
      const type = HINT_TYPES.includes(attrs.type) ? attrs.type : 'info';
      return `<div class="block-hint block-hint--${type}">\n`;
    },
    close: () => '</div>\n',
  });
}

// Scoped to a single renderMarkdown() call (reset there) — see the currentImageMeta
// comment below for why this is safe under build.mjs's sequential, single-file-at-a-time
// rendering. Gives each `:::tabs` group and its panels stable ids so tabs.js can wire
// `aria-controls`/`aria-labelledby` pairs between buttons and panels.
let tabGroupCounter = 0;
let currentTabGroupId = 0;
let currentTabIndex = 0;

function registerTabs(md) {
  registerContainer(md, {
    name: 'tabs',
    open: () => {
      tabGroupCounter += 1;
      currentTabGroupId = tabGroupCounter;
      currentTabIndex = 0;
      return `<div class="block-tabs" id="tabs-${currentTabGroupId}">\n`;
    },
    close: () => '</div>\n',
  });
  registerContainer(md, {
    name: 'tab',
    open: (attrs, mdInstance) => {
      const label = attrs.label
        ? ` data-label="${mdInstance.utils.escapeHtml(attrs.label)}"`
        : '';
      const panelId = `tabpanel-${currentTabGroupId}-${currentTabIndex}`;
      currentTabIndex += 1;
      return `<div class="block-tabs__tab" id="${panelId}"${label}>\n`;
    },
    close: () => '</div>\n',
  });
}

function registerExpandable(md) {
  registerContainer(md, {
    name: 'expandable',
    open: (attrs, mdInstance) => {
      const title = attrs.title ? mdInstance.utils.escapeHtml(attrs.title) : '';
      return (
        '<details class="block-expandable">\n' +
        `<summary class="block-expandable__summary">${title}</summary>\n` +
        '<div class="block-expandable__content">\n'
      );
    },
    close: () => '</div>\n</details>\n',
  });
}

function registerStepper(md) {
  registerContainer(md, {
    name: 'stepper',
    open: () => '<div class="block-stepper">\n',
    close: () => '</div>\n',
  });
  registerContainer(md, {
    name: 'step',
    open: (attrs, mdInstance) => {
      const title = attrs.title
        ? `<div class="block-stepper__step-title">${mdInstance.utils.escapeHtml(attrs.title)}</div>\n`
        : '';
      return `<div class="block-stepper__step">\n${title}<div class="block-stepper__step-content">\n`;
    },
    close: () => '</div>\n</div>\n',
  });
}

function registerCards(md) {
  registerContainer(md, {
    name: 'cards',
    open: () => '<div class="block-cards">\n',
    close: () => '</div>\n',
  });
  registerContainer(md, {
    name: 'card',
    open: (attrs, mdInstance) => {
      const title = attrs.title
        ? `<div class="block-cards__card-title">${mdInstance.utils.escapeHtml(attrs.title)}</div>\n`
        : '';
      return `<div class="block-cards__card">\n${title}<div class="block-cards__card-content">\n`;
    },
    close: () => '</div>\n</div>\n',
  });
}

// Set by renderMarkdown() just before each md.render() call and read back by the `figure`
// container's `open` closure below — safe because build.mjs processes files one at a time
// (sequential awaits, single-threaded Node), never concurrently.
let currentImageMeta = {};

// `:::figure{src="./assets/x.png" alt="..." caption="..."}` `:::` — no nested `![alt](src)`
// line required; the image tag(s) are built entirely from the info-string attrs plus the
// width/height/hasDark that build.mjs's pre-pass resolved via src/render/images.mjs and
// handed in through renderMarkdown()'s imageMeta map. Emits BOTH a light and (if a dark
// variant exists) a dark `<img>` rather than swapping `src` via JS — blocks.css shows/hides
// each by `.block-figure__light`/`.block-figure__dark` under `[data-theme="dark"]`.
function registerFigure(md) {
  registerContainer(md, {
    name: 'figure',
    open: (attrs, mdInstance) => {
      const src = attrs.src || '';
      const escapedSrc = mdInstance.utils.escapeHtml(src);
      const alt = mdInstance.utils.escapeHtml(attrs.alt || '');
      const meta = currentImageMeta[src] || {};
      const width = meta.width || '';
      const height = meta.height || '';
      const lightImg =
        `<img src="${escapedSrc}" alt="${alt}" width="${width}" height="${height}" ` +
        `data-zoomable="true" class="block-figure__light">`;
      let darkImg = '';
      if (meta.hasDark) {
        const darkSrc = escapedSrc.replace(/(\.[^./]+)$/, '.dark$1');
        darkImg =
          `<img src="${darkSrc}" alt="${alt}" width="${width}" height="${height}" ` +
          `data-zoomable="true" class="block-figure__dark">`;
      }
      const caption = attrs.caption
        ? `<figcaption>${mdInstance.utils.escapeHtml(attrs.caption)}</figcaption>`
        : '';
      return `<figure class="block-figure">\n${lightImg}\n${darkImg}\n${caption}\n`;
    },
    close: () => '</figure>\n',
  });
}

const md = new MarkdownIt({ html: true });
md.use(footnote);
registerHint(md);
registerTabs(md);
registerExpandable(md);
registerStepper(md);
registerCards(md);
registerFigure(md);
md.renderer.rules.fence = (tokens, idx) => highlightFence(tokens[idx]);

export function renderMarkdown(content, imageMeta = {}) {
  currentImageMeta = imageMeta;
  tabGroupCounter = 0;
  return md.render(content);
}
