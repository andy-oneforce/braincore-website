// Build-time image pipeline for the `Figure` content block (R05). Resizes a docs figure's
// source image (and its co-located `<name>.dark.<ext>` variant, if one exists) into the
// build's dist/ output, same sharp import pattern as ./og.mjs. Dimensions are read back off
// the RESIZED output, not the source, so the width/height attributes build.mjs hands to
// markdown.mjs's `registerFigure()` always match what actually ships (CLS=0 needs that).

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const MAX_WIDTH = 1200;

function darkVariantPath(srcPathAbs) {
  const ext = path.extname(srcPathAbs);
  const base = path.basename(srcPathAbs, ext);
  return path.join(path.dirname(srcPathAbs), `${base}.dark${ext}`);
}

async function resizeInto(srcPathAbs, destDir) {
  const outFile = path.join(destDir, path.basename(srcPathAbs));
  await fs.mkdir(destDir, { recursive: true });
  await sharp(srcPathAbs)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .toFile(outFile);
  const outMeta = await sharp(outFile).metadata();
  return { width: outMeta.width, height: outMeta.height };
}

// processFigureImage: resizes srcPathAbs into destDir (preserving its filename), and — if a
// co-located `<name>.dark.<ext>` sibling exists — resizes that too. Returns the shipped
// light image's dimensions plus whether a dark variant was found.
export async function processFigureImage(srcPathAbs, destDir) {
  const { width, height } = await resizeInto(srcPathAbs, destDir);
  const darkSrc = darkVariantPath(srcPathAbs);
  let hasDark = false;
  try {
    await fs.access(darkSrc);
    await resizeInto(darkSrc, destDir);
    hasDark = true;
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  return { width, height, hasDark };
}
