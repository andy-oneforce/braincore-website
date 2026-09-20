---
title: Why we hand-rolled the build script
description: The original plan reached for Astro. Here's the one reported bug that changed it.
author: Andy Zhulenev
date: 2026-09-15
tags: [Engineering, Architecture]
---

The original plan reached for Astro. It's a good default for a docs site — content collections, an island model, zero-JS-by-default pages. The reason we didn't ship it comes down to one reported bug.

## The sidebar-flicker report

Cloudflare's own developer docs run on Astro + Starlight, and hit a filed, reproduced defect: the sidebar drops and the TOC highlight lags by a frame on every navigation, specifically on Cloudflare Pages + Chrome. It shipped as `<ClientRouter />`-driven view transitions — fast, but with a failure mode nobody could fully explain.

We didn't want to inherit a bug we couldn't debug ourselves. A framework's client router is opaque by design; when it misbehaves, you're waiting on someone else's fix.

## The fix that isn't framework-specific

Full static navigation — every link a real page load, no client router — sidesteps the whole class of bug. That's what a hand-rolled build does by default, since there's no router to misconfigure in the first place.

The tradeoff is real: no island hydration, no client-side transitions, no framework ecosystem to lean on. What we get back is a build we can read start to finish, and a navigation model with exactly one failure mode — a broken link — instead of an open-ended one.

That trade is the whole thesis behind `build.mjs`: markdown in, static HTML out, nothing in between that we didn't write ourselves.
