#!/usr/bin/env python3
"""Deploy a folder of built static files to GitHub Pages, non-interactively.

Same command creates a new site and updates an existing one — there is no
separate "first deploy" step and no GitHub dashboard action required, as
long as Phase 1 (repo exists, Pages enabled, a non-interactive push
credential is available) is already done.

Two modes:

  branch (default) — force-pushes an orphan commit built from --source onto
    --branch (default gh-pages). This is the standard gh-pages pattern: each
    deploy replaces the branch's whole history with one commit, so create
    and update are the same operation. Use when GitHub Pages is configured
    with Source = the gh-pages branch.

  docs — clones the repo's default branch, replaces its docs/ folder with
    --source, commits and pushes normally (history preserved). Use when
    GitHub Pages is configured with Source = /docs on main.

Usage:
  deploy-github-pages.py <source_dir> <repo> [options]

  <repo>   a git remote URL (git@github.com:user/repo.git or
           https://github.com/user/repo.git), or the path to an already
           cloned local repo (its 'origin' remote is used).

Options:
  --mode {branch,docs}    default: branch
  --branch NAME           branch to deploy to in branch mode (default: gh-pages)
  --message TEXT          commit message (default: "Deploy <timestamp>")
  --work-dir PATH         scratch directory for the deploy checkout
                          (default: a fresh tempdir, removed after the run)
  --dry-run               do everything except the final git push

Exit codes: 0 = deployed (or dry-run completed), 1 = usage/validation error,
2 = a git command failed.

Examples:
  deploy-github-pages.py ./dist git@github.com:andy-oneforce/my-site.git
  deploy-github-pages.py ./dist git@github.com:andy-oneforce/my-site.git --mode docs
  deploy-github-pages.py ./dist ./checkouts/my-site --branch gh-pages --dry-run
"""

import argparse
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path


def run(cmd, cwd, check=True):
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if check and result.returncode != 0:
        print(f"$ {' '.join(cmd)}", file=sys.stderr)
        print(result.stdout, file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        raise SystemExit(2)
    return result


def resolve_repo(repo_arg):
    """Return (remote_url, local_origin_path_or_None)."""
    local = Path(repo_arg).expanduser()
    if local.exists():
        if not (local / ".git").exists():
            print(f"error: {local} exists but is not a git repo (no .git)", file=sys.stderr)
            raise SystemExit(1)
        origin = run(["git", "remote", "get-url", "origin"], cwd=local).stdout.strip()
        if not origin:
            print(f"error: {local} has no 'origin' remote configured", file=sys.stderr)
            raise SystemExit(1)
        return origin, local
    return repo_arg, None


def copy_tree_contents(source, dest):
    for item in source.iterdir():
        target = dest / item.name
        if item.is_dir():
            shutil.copytree(item, target)
        else:
            shutil.copy2(item, target)


def deploy_branch_mode(source, remote_url, branch, message, work_dir, dry_run):
    run(["git", "init", "-q"], cwd=work_dir)
    run(["git", "remote", "add", "origin", remote_url], cwd=work_dir)
    run(["git", "checkout", "--orphan", branch], cwd=work_dir)
    copy_tree_contents(source, work_dir)
    run(["git", "add", "-A"], cwd=work_dir)
    commit = run(["git", "commit", "-q", "-m", message], cwd=work_dir, check=False)
    if commit.returncode != 0 and "nothing to commit" not in (commit.stdout + commit.stderr):
        print(commit.stdout, file=sys.stderr)
        print(commit.stderr, file=sys.stderr)
        raise SystemExit(2)
    if dry_run:
        print(f"[dry-run] would force-push {work_dir} -> {remote_url} ({branch})")
        return
    run(["git", "push", "--force", "origin", f"{branch}:{branch}"], cwd=work_dir)


def deploy_docs_mode(source, remote_url, message, work_dir, dry_run):
    run(["git", "clone", "-q", remote_url, str(work_dir)], cwd=work_dir.parent)
    docs_dir = work_dir / "docs"
    if docs_dir.exists():
        shutil.rmtree(docs_dir)
    docs_dir.mkdir()
    copy_tree_contents(source, docs_dir)
    run(["git", "add", "-A"], cwd=work_dir)
    commit = run(["git", "commit", "-q", "-m", message], cwd=work_dir, check=False)
    if commit.returncode != 0 and "nothing to commit" not in (commit.stdout + commit.stderr):
        print(commit.stdout, file=sys.stderr)
        print(commit.stderr, file=sys.stderr)
        raise SystemExit(2)
    if dry_run:
        print(f"[dry-run] would push {work_dir} (docs/) -> {remote_url}")
        return
    run(["git", "push", "origin", "HEAD"], cwd=work_dir)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source_dir")
    parser.add_argument("repo")
    parser.add_argument("--mode", choices=["branch", "docs"], default="branch")
    parser.add_argument("--branch", default="gh-pages")
    parser.add_argument("--message", default=None)
    parser.add_argument("--work-dir", default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    source = Path(args.source_dir).expanduser().resolve()
    if not source.is_dir() or not any(source.iterdir()):
        print(f"error: --source_dir {source} does not exist or is empty", file=sys.stderr)
        raise SystemExit(1)

    remote_url, local_origin = resolve_repo(args.repo)
    message = args.message or f"Deploy {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}"

    scratch = None
    try:
        if args.work_dir:
            work_dir = Path(args.work_dir).expanduser().resolve()
            work_dir.mkdir(parents=True, exist_ok=True)
        else:
            scratch = tempfile.mkdtemp(prefix="gh-pages-deploy-")
            work_dir = Path(scratch)

        if args.mode == "branch":
            deploy_branch_mode(source, remote_url, args.branch, message, work_dir, args.dry_run)
        else:
            deploy_docs_mode(source, remote_url, message, work_dir, args.dry_run)
    finally:
        if scratch:
            shutil.rmtree(scratch, ignore_errors=True)

    if not args.dry_run:
        print(f"Deployed {source} -> {remote_url} ({args.mode} mode)")


if __name__ == "__main__":
    main()
