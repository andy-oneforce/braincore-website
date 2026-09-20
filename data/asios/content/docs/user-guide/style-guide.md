---
title: Style Guide
description: A reference page showing every content-block directive available to a docs author — hints, code, tabs, expandable sections, a stepper, cards, and tables.
---

This page is a living reference, not reader-facing narrative — it exists so a docs author can see
every supported content block rendered in place before using it in a real page.

## Hints

:::hint{type="info"}
This is an **info** hint — general context that's useful but not critical.
:::

:::hint{type="success"}
This is a **success** hint — confirms something worked as expected.
:::

:::hint{type="warning"}
This is a **warning** hint — flags something the reader should double-check.
:::

:::hint{type="danger"}
This is a **danger** hint — calls out something that can break or lose work.
:::

## Code

```js
function greet(name) {
  return `Hello, ${name}!`;
}
```

## Tabs

:::::tabs
::::tab{label="npm"}
```bash
npm install asios
```
::::
::::tab{label="pnpm"}
```bash
pnpm add asios
```
::::
:::::

## Expandable

:::expandable{title="What does this do?"}
This content is hidden until the reader expands the section.
:::

## Stepper

:::::stepper
::::step{title="Install"}
Install the Workspace onto your machine.
::::
::::step{title="Configure"}
Point it at your account.
::::
::::step{title="Go"}
Start your first activity.
::::
:::::

## Cards

:::::cards
::::card{title="Getting started"}
Install your Workspace and take your first actions in it.
::::
::::card{title="Concepts"}
The two ideas worth understanding early — layers and activities.
::::
:::::

## Tables

| Directive | Renders as |
|---|---|
| `hint` | `<div class="block-hint">` |
| `tabs` / `tab` | `<div class="block-tabs">` |
| `expandable` | `<details class="block-expandable">` |
| `stepper` / `step` | `<div class="block-stepper">` |
| `cards` / `card` | `<div class="block-cards">` |
