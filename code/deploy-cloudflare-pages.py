#!/usr/bin/env python3
"""Deploy a folder of built static files to Cloudflare Pages, non-interactively.

Same command creates a new Pages project and updates an existing one — there
is no separate "first deploy" step and no Cloudflare dashboard action
required, as long as a CLOUDFLARE_API_TOKEN scoped to Account · Cloudflare
Pages:Edit is available in the environment.

Direct upload: builds a multipart/form-data request from every file under
--source_dir (keyed by its path relative to --source_dir) and POSTs it to
`POST /accounts/{account}/pages/projects/{project}/deployments` — the same
call shape this activity already used ad hoc for its Cloudflare Pages work
(Output/phase-0.3-deploy-status.md v3.0-v8.0). If the named project does not
exist yet, it is created first (`POST /accounts/{account}/pages/projects`)
before the deployment upload, so create and update are the same operation,
same as deploy-github-pages.py.

Usage:
  deploy-cloudflare-pages.py <source_dir> <project> [options]

  <project>   the Cloudflare Pages project name (created if it does not
              already exist under the target account).

Environment:
  CLOUDFLARE_API_TOKEN    required — scoped at minimum to
                          Account · Cloudflare Pages:Edit
  CLOUDFLARE_ACCOUNT_ID   required unless --account-id is given

Options:
  --account-id ID           Cloudflare account id (overrides
                             CLOUDFLARE_ACCOUNT_ID)
  --production-branch NAME  branch name recorded when the project is
                             created (default: main; ignored if the project
                             already exists)
  --dry-run                 do everything except the project-create and
                             deployment-upload API calls

Exit codes: 0 = deployed (or dry-run completed), 1 = usage/validation error,
2 = a Cloudflare API call failed.

Examples:
  deploy-cloudflare-pages.py ./dist braincore-website
  deploy-cloudflare-pages.py ./dist braincore-website-test2 --dry-run
  deploy-cloudflare-pages.py ./dist braincore-website --account-id 18a2cbba23075bcfefb441ec3e7bd0ca
"""

import argparse
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

API_BASE = "https://api.cloudflare.com/client/v4"


def api_request(method, path, token, data=None, headers=None):
    url = f"{API_BASE}{path}"
    req_headers = {"Authorization": f"Bearer {token}"}
    if headers:
        req_headers.update(headers)
    body = None
    if data is not None:
        if isinstance(data, (bytes, bytearray)):
            body = data
        else:
            body = json.dumps(data).encode("utf-8")
            req_headers.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw)
        except ValueError:
            parsed = {"raw": raw}
        return e.code, parsed


def collect_files(source):
    files = []
    for path in sorted(source.rglob("*")):
        if path.is_file():
            rel = path.relative_to(source).as_posix()
            files.append((f"/{rel}", path))
    return files


def encode_multipart(files):
    boundary = uuid.uuid4().hex
    chunks = []
    for rel_path, abs_path in files:
        ctype = mimetypes.guess_type(rel_path)[0] or "application/octet-stream"
        chunks.append(
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="{rel_path}"; filename="{rel_path}"\r\n'
            f'Content-Type: {ctype}\r\n\r\n'.encode("utf-8")
            + abs_path.read_bytes()
            + b"\r\n"
        )
    chunks.append(f"--{boundary}--\r\n".encode("utf-8"))
    return f"multipart/form-data; boundary={boundary}", b"".join(chunks)


def project_exists(account, project, token):
    status, resp = api_request("GET", f"/accounts/{account}/pages/projects/{project}", token)
    if status == 200 and resp.get("success"):
        return True
    if status == 404:
        return False
    print(f"error: could not check project existence — HTTP {status}: {resp}", file=sys.stderr)
    raise SystemExit(2)


def create_project(account, project, production_branch, token):
    status, resp = api_request(
        "POST",
        f"/accounts/{account}/pages/projects",
        token,
        data={"name": project, "production_branch": production_branch},
    )
    if status not in (200, 201) or not resp.get("success"):
        print(f"error: project create failed — HTTP {status}: {resp}", file=sys.stderr)
        raise SystemExit(2)


def upload_deployment(account, project, files, token):
    content_type, body = encode_multipart(files)
    status, resp = api_request(
        "POST",
        f"/accounts/{account}/pages/projects/{project}/deployments",
        token,
        data=body,
        headers={"Content-Type": content_type},
    )
    if status not in (200, 201) or not resp.get("success"):
        print(f"error: deployment upload failed — HTTP {status}: {resp}", file=sys.stderr)
        raise SystemExit(2)
    return resp["result"]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source_dir")
    parser.add_argument("project")
    parser.add_argument("--account-id", default=None)
    parser.add_argument("--production-branch", default="main")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    source = Path(args.source_dir).expanduser().resolve()
    if not source.is_dir() or not any(source.iterdir()):
        print(f"error: --source_dir {source} does not exist or is empty", file=sys.stderr)
        raise SystemExit(1)

    files = collect_files(source)
    if not files:
        print(f"error: {source} has no files to upload", file=sys.stderr)
        raise SystemExit(1)

    token = os.environ.get("CLOUDFLARE_API_TOKEN")
    if not token:
        print("error: CLOUDFLARE_API_TOKEN is not set in the environment", file=sys.stderr)
        raise SystemExit(1)

    account = args.account_id or os.environ.get("CLOUDFLARE_ACCOUNT_ID")
    if not account:
        print("error: Cloudflare account id not given (--account-id or CLOUDFLARE_ACCOUNT_ID)", file=sys.stderr)
        raise SystemExit(1)

    if args.dry_run:
        print(f"[dry-run] project: {args.project} (account {account})")
        print(f"[dry-run] would create project if missing (production_branch={args.production_branch})")
        print(f"[dry-run] would upload {len(files)} file(s) from {source} as a new deployment")
        return

    if not project_exists(account, args.project, token):
        create_project(account, args.project, args.production_branch, token)

    result = upload_deployment(account, args.project, files, token)
    url = result.get("url", "")
    print(f"Deployed {source} -> {args.project} ({url})")


if __name__ == "__main__":
    main()
