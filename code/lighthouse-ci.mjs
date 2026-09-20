// lighthouse-ci.mjs — Lighthouse performance budget check over real headless Chrome.
//
// [[260908-015-activity]] R02, step 8.2 of [[260907-009-gitbook-website-build-recommendation]] §6.
// Serves ../data/asios/dist on a free local port (gzip-encoding .js responses so JS transfer-size
// numbers are real gzip sizes), runs lighthouse()'s programmatic API against one URL per template
// (marketing home, docs guide, blog post), and checks Performance >= 95 and JS gzip KB <= 60 per page.
//
// Usage: node lighthouse-ci.mjs   (build.mjs must have already produced ../data/asios/dist)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const CODE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(CODE_ROOT, '..', 'data', 'asios', 'dist');

const PAGES = [
  { name: 'marketing', route: '/' },
  { name: 'docs', route: '/docs/guide/' },
  { name: 'blog', route: '/blog/2026-09-11-hello-world/' },
];

const PERFORMANCE_MIN = 95;
const JS_GZIP_KB_MAX = 60;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = http.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

function serve(port) {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    let filePath = path.join(DIST_DIR, urlPath);
    if (!filePath.startsWith(DIST_DIR)) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath);
      const headers = { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' };
      const isJs = ext === '.js' || ext === '.mjs';
      if (isJs) {
        headers['Content-Encoding'] = 'gzip';
        res.writeHead(200, headers);
        res.end(zlib.gzipSync(data));
      } else {
        res.writeHead(200, headers);
        res.end(data);
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

function jsGzipKB(lhr) {
  const items = lhr.audits['network-requests']?.details?.items || [];
  let totalBytes = 0;
  for (const item of items) {
    const isJs = item.resourceType === 'Script' || /javascript/.test(item.mimeType || '');
    if (isJs) totalBytes += item.transferSize || 0;
  }
  return totalBytes / 1024;
}

async function auditPage(port, page) {
  const url = `http://localhost:${port}${page.route}`;
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
  try {
    const runnerResult = await lighthouse(url, {
      port: chrome.port,
      onlyCategories: ['performance'],
    });
    const lhr = runnerResult.lhr;
    const performanceScore = lhr.categories.performance.score * 100;
    const jsKB = jsGzipKB(lhr);
    return { name: page.name, url, performanceScore, jsGzipKB: jsKB };
  } finally {
    await chrome.kill();
  }
}

async function main() {
  const port = await freePort();
  const server = await serve(port);
  const results = [];
  let failed = false;
  try {
    for (const page of PAGES) {
      const result = await auditPage(port, page);
      results.push(result);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('page       url                                    performance   js-gzip-kb');
  for (const r of results) {
    const scoreStr = r.performanceScore.toFixed(0).padStart(11);
    const kbStr = r.jsGzipKB.toFixed(1).padStart(10);
    console.log(`${r.name.padEnd(10)} ${r.url.padEnd(38)} ${scoreStr}   ${kbStr}`);
    if (r.performanceScore < PERFORMANCE_MIN) {
      console.log(`  BUDGET FAIL: performance ${r.performanceScore.toFixed(0)} < ${PERFORMANCE_MIN}`);
      failed = true;
    }
    if (r.jsGzipKB > JS_GZIP_KB_MAX) {
      console.log(`  BUDGET FAIL: js-gzip-kb ${r.jsGzipKB.toFixed(1)} > ${JS_GZIP_KB_MAX}`);
      failed = true;
    }
  }

  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
