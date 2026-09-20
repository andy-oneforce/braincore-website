# Contributing to the ASIOS website

> Source: [[260907-009-gitbook-website-build-recommendation]] §6 Phase 11, step 11.3.
> Produced by activity [[260919-004-activity]] (chunk C03, on top of
> [[260908-018-plan]] R03). This file lives in the site repo's own `docs/`
> folder (repo root, alongside `code/` and `data/asios/`) — it documents the
> *website's* build/deploy pipeline, not the ASIOS vault.

This is a hand-rolled static site: markdown in `data/asios/content/`, a small
build script (`code/build.mjs`) that turns it into `data/asios/dist/`, no
framework. There are three content kinds — **docs**, **marketing pages**, and
**blog posts** — each with its own folder and frontmatter shape. This doc
covers all four things a newcomer needs to do: add one of each kind, and
release the result.

Every procedure ends the same way: run the build and check `dist/`.

```
cd code
npm ci        # first time only
node build.mjs
```

`build.mjs` exits non-zero and prints the offending file + field on any bad
frontmatter, a broken nav entry, or an unknown marketing section type — it
fails loudly rather than silently dropping content.

## 1. Add a docs page

Docs live under `data/asios/content/docs/<space>/`. Today there is one
**space**, `user-guide/`, but a space is just "a directory with its own
`summary.yml`" — nothing more (see §2 for adding a new one).

1. Create the markdown file, e.g. `data/asios/content/docs/user-guide/concepts/routines.md`:
   ```markdown
   ---
   title: Routines
   description: One line describing the page.
   ---

   Page body in markdown. Use `## Heading` for sections — headings become the
   "On this page" table of contents automatically; you don't hand-write it.
   ```
   `title` is required; `description` is optional but recommended (used in
   `<meta>` tags and link previews).
2. Add it to the space's `summary.yml` (`data/asios/content/docs/user-guide/summary.yml`),
   as a `page:` entry — the path is relative to the space's own folder, not
   the repo:
   ```yaml
   nav:
     - page: index.md
     - page: getting-started/index.md
       items:
         - page: getting-started/installation.md
         - page: getting-started/first-steps.md
     - page: concepts/layers.md
       items:
         - page: concepts/activities.md
         - page: concepts/routines.md   # <-- the new page
     - page: style-guide.md
   ```
   A page you don't add to `summary.yml` still builds (its HTML is written to
   `dist/`), but has no sidebar entry, breadcrumb, or prev/next — always add
   the nav entry in the same step as the file.
3. Build and check: `node build.mjs`, then open
   `data/asios/dist/docs/user-guide/concepts/routines.html` and confirm the
   sidebar shows the new page in the right place with working prev/next links.

## 2. Add a doc group or a whole new doc space

**A group** is just a nav entry with nested `items:` — any existing `page:`
entry can become a group by adding an `items:` list under it (as
`concepts/layers.md` already is, above). There's no separate mechanism; you
create the child pages (§1) and nest them under the parent entry.

**A new space** is a new subdirectory of `data/asios/content/docs/` carrying
its own `summary.yml`. The build script (`findDocSpaces` in `code/nav.mjs`)
discovers every directory under `docs/` that has a `summary.yml` — you don't
register a space anywhere else.

1. Create the directory and its first page, e.g.
   `data/asios/content/docs/api-reference/index.md` with `title`/`description`
   frontmatter as in §1.
2. Add `data/asios/content/docs/api-reference/summary.yml`:
   ```yaml
   title: API Reference
   nav:
     - page: index.md
   ```
3. Build (`node build.mjs`) and confirm `dist/docs/api-reference/index.html`
   exists with its own sidebar scoped to just this space's `title` and pages.

## 3. Add a marketing page

Marketing pages live flat in `data/asios/content/pages/` (today:
`home.md`, `pricing.md`, `about.md`). A page's frontmatter declares its
content as a list of typed **sections** — there's no page body markdown for
the sections themselves (the body below the `---` is optional extra prose,
rendered under the sections).

1. Create `data/asios/content/pages/<name>.md`:
   ```markdown
   ---
   title: <Page title>
   description: "One line for <meta> tags."
   sections:
     - type: hero
       heading: "Headline"
       subheading: "Supporting line."
       cta: { label: "Get started", href: "/docs/user-guide/index.html" }
       animate: true
     - type: featureGrid
       heading: "Section heading"
       items:
         - icon: "🏛️"
           title: "Feature name"
           body: "Feature description."
   ---
   ```
2. `sections[].type` must be one of the six the build script knows about
   (`code/src/templates/marketing/sections-schema.mjs`): `hero`,
   `featureGrid`, `testimonial`, `pricingTable`, `ctaBanner`, `logoStrip`.
   Each type has its own required fields — `hero`/`ctaBanner` need `heading`;
   `featureGrid`/`testimonial`/`logoStrip` need an `items`/`logos` array;
   `pricingTable` needs a `plans` array of `{name, price, cta: {label, href}}`.
   Any `cta` anywhere needs both `label` and `href`, or the build fails naming
   the exact section and field. Copy an existing page's section (`home.md`,
   `pricing.md`, `about.md`) as a starting template rather than writing one
   from the schema alone.
3. A new page under `content/pages/` is picked up automatically — there is no
   nav file to edit (marketing pages aren't part of a docs space). Link to it
   from wherever makes sense (another page's `cta.href`, the header/footer in
   `code/src/templates/shared/`) if it needs to be reachable by more than a
   direct URL.
4. Build and check: `node build.mjs`, then open
   `data/asios/dist/<name>/index.html` and confirm every section renders.

## 4. Add a blog post

Blog posts live in `data/asios/content/blog/posts/`, one file per post, named
`YYYY-MM-DD-slug.md` — the date in the filename drives sort order (newest
first) and must match the frontmatter `date`.

1. Create `data/asios/content/blog/posts/2026-09-20-my-new-post.md`:
   ```markdown
   ---
   title: My new post
   description: One line, used on the /blog listing and link previews.
   author: Your Name
   date: 2026-09-20
   tags: [Engineering]
   ---

   Post body in markdown. `## Heading`s again build the on-page table of
   contents automatically.
   ```
   `title`, `author`, and `date` are required; `description` and `tags` are
   optional but recommended — `tags` drives the tag filter/tag pages, and
   posts sharing a tag show up in each other's "Related posts."
2. Nothing else to register — the blog listing (`/blog/`), pagination, tag
   pages, and the post's `AuthorByline`/`RelatedPosts` are all generated from
   the posts directory at build time.
3. Build and check: `node build.mjs`, then open
   `data/asios/dist/blog/index.html` (post appears newest-first) and
   `data/asios/dist/blog/2026-09-20-my-new-post/index.html` (byline, tags,
   table of contents, and related posts all render).

## 5. Release

Merging to `main` releases automatically — there is no separate manual step
for a normal change.

- **On every pull request:** `.github/workflows/deploy.yml`'s `build` job runs
  `npm ci`, `node build.mjs`, `node link-check.mjs`, and
  `node lighthouse-ci.mjs`. A broken build, a dead internal link, or a
  Lighthouse regression fails the check.
- **On push to `main`:** the `deploy` job runs `npm ci` + `node build.mjs`
  again, then publishes `data/asios/dist/` to the `gh-pages` branch as a
  force-pushed orphan commit (one commit replacing the branch's whole
  history each time — the standard GitHub Pages pattern), writing a `CNAME`
  file (`braincore.ai`) into that commit so the custom domain keeps working.
  This uses the workflow run's own `GITHUB_TOKEN`; no secrets to configure.
  Typically live within a few minutes of the merge.

**To test a release manually before merging** (e.g. to sanity-check a deploy
change itself), build locally and push to `gh-pages` by hand with the same
script CI uses:

```
cd code
node build.mjs
python3 deploy-github-pages.py ../data/asios/dist <repo-url-or-local-clone> \
  --mode branch --branch gh-pages --dry-run   # drop --dry-run to actually push
```

`deploy-github-pages.py --help` documents `--mode docs` (for a host configured
to serve `/docs` on `main` instead of a `gh-pages` branch) and `--work-dir`
(to inspect the orphan commit before it's pushed).
