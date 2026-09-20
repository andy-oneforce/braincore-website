// Per-file git facts for the docs page footer (LastUpdated + EditLink), read at build time.
//   lastCommitDate(file) — the committer date of the file's last commit, as an ISO 8601 string
//                          (`git log -1 --format=%cI -- <file>`), or null;
//   repoPath(file)       — the file's path from the git repo root (forward slashes), or null.
// Both fall back to null — never throw — for a file git does not track (an untracked or ignored
// source, `git log` prints nothing) and when git is missing or the file is outside a work tree, so
// a page then renders without the date / link instead of failing the build. Results are cached per
// build (one `git` spawn per file per fact), keyed by absolute path.

import { execFileSync } from 'node:child_process';
import path from 'node:path';

const dateCache = new Map();
const repoPathCache = new Map();

function git(file, args) {
  try {
    return execFileSync('git', args, {
      cwd: path.dirname(file),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

export function lastCommitDate(file) {
  if (!file) return null;
  const key = path.resolve(file);
  if (!dateCache.has(key)) {
    dateCache.set(key, git(key, ['log', '-1', '--format=%cI', '--', path.basename(key)]) || null);
  }
  return dateCache.get(key);
}

export function repoPath(file) {
  if (!file) return null;
  const key = path.resolve(file);
  if (!repoPathCache.has(key)) {
    const prefix = git(key, ['rev-parse', '--show-prefix']);
    const isRepo = git(key, ['rev-parse', '--is-inside-work-tree']) === 'true';
    repoPathCache.set(key, isRepo ? (prefix + path.basename(key)).split(path.sep).join('/') : null);
  }
  return repoPathCache.get(key);
}
