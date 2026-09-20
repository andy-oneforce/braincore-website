// Build-time OG image renderer shared by all 3 website-build templates (docs/marketing/blog).
// Renders a branded 1200x630 PNG for a page title via satori (JSX-less element tree -> SVG) then
// rasterizes with sharp (already a build dependency, so no extra native dep). Colours are read live
// out of src/styles/tokens.css (--bg/--text/--accent) rather than duplicated here, so a design-token
// change flows through automatically. build.mjs writes the result to dist/og/<slug>.png using the
// same slugFromUrlPath convention head.mjs already links every page's og:image to.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import sharp from 'sharp';
import { loadSiteConfig } from './head.mjs';

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_CSS_PATH = path.join(THIS_DIR, '..', 'styles', 'tokens.css');
const FONT_DIR = path.join(THIS_DIR, '..', '..', 'node_modules', '@fontsource', 'inter', 'files');
const FONT_REGULAR_PATH = path.join(FONT_DIR, 'inter-latin-400-normal.woff');
const FONT_BOLD_PATH = path.join(FONT_DIR, 'inter-latin-700-normal.woff');

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

let cachedTokens = null;
let cachedFonts = null;

// Pulls the :root custom-property values straight out of tokens.css so the image tracks the design
// system instead of hardcoding a second copy of its colours.
function loadTokens() {
  if (!cachedTokens) {
    const css = fs.readFileSync(TOKENS_CSS_PATH, 'utf8');
    const rootBody = (css.match(/:root\s*{([^}]*)}/) || [, ''])[1];
    const tokens = {};
    for (const m of rootBody.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      tokens[m[1]] = m[2].trim();
    }
    cachedTokens = tokens;
  }
  return cachedTokens;
}

function loadFonts() {
  if (!cachedFonts) {
    cachedFonts = [
      { name: 'Inter', data: fs.readFileSync(FONT_REGULAR_PATH), weight: 400, style: 'normal' },
      { name: 'Inter', data: fs.readFileSync(FONT_BOLD_PATH), weight: 700, style: 'normal' },
    ];
  }
  return cachedFonts;
}

// renderOgImage: builds one 1200x630 branded PNG (Buffer) for a page title.
export async function renderOgImage({ title = '' } = {}) {
  const tokens = loadTokens();
  const config = loadSiteConfig();
  const bg = tokens.bg || '#ffffff';
  const text = tokens.text || '#1f2328';
  const accent = tokens.accent || '#346ddb';
  const heading = title || config.site_name || '';

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: bg,
          padding: '64px',
          fontFamily: 'Inter',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                width: '64px',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: accent,
              },
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                width: '960px',
                fontSize: 56,
                fontWeight: 700,
                lineHeight: 1.25,
                color: text,
              },
              children: heading,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontSize: 28,
                fontWeight: 400,
                color: accent,
              },
              children: config.site_name || '',
            },
          },
        ],
      },
    },
    { width: OG_WIDTH, height: OG_HEIGHT, fonts: loadFonts() }
  );

  return sharp(Buffer.from(svg)).png().toBuffer();
}
