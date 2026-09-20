---
title: Inside ASIOS's documentation pipeline
description: How markdown source becomes a docs page, sidebar entry, and table of contents.
author: Andy Zhulenev
date: 2026-09-18
tags: [Engineering, Documentation]
---

Every page in the docs section starts as a single markdown file with frontmatter, and ends as static HTML with a sidebar entry and a table of contents already wired up. Here's what happens in between.

## From markdown to page

`build.mjs` walks the docs source tree, reads each file's frontmatter for title, description, and ordering, and renders the body through the same markdown pipeline the blog uses. The rendered HTML is then handed to the docs template, which adds the sidebar, breadcrumbs, and page chrome.

## Headings become navigation

The table of contents isn't hand-authored — it's extracted from the already-rendered page HTML. Every `<h2>` and `<h3>` that doesn't already carry an id gets one generated from its text, and those headings become the nested "On this page" list. The same extraction step now runs on blog posts too, so a long post gets the same on-page navigation a docs page does.

Keeping the sidebar, breadcrumbs, and table of contents all derived from the source files — rather than maintained by hand alongside them — is what keeps the docs section from drifting out of sync with itself as it grows.
