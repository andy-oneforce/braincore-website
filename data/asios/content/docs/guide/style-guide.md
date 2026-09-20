---
title: Style Guide
description: One plain-Markdown example of each content block, proving the directive pipeline.
---

This page is the acceptance surface for [[260907-009-gitbook-website-build-recommendation]] §6
Phase 3 step 3.1 — each block below is written as plain-Markdown directive syntax and rendered by
`markdown.mjs`'s `renderMarkdown`. No raw HTML is used in this file.

## Hint

:::hint{type="info"}
This is an info hint — the default variant.
:::

:::hint{type="success"}
This is a success hint.
:::

:::hint{type="warning"}
This is a warning hint.
:::

:::hint{type="danger"}
This is a danger hint.
:::

## Tabs

::::tabs
:::tab{label="npm"}
```
npm install
```
:::

:::tab{label="yarn"}
```
yarn install
```
:::
::::

## Expandable

:::expandable{title="What does this do?"}
This content is hidden until the reader expands the section.
:::

## Stepper

:::::stepper
::::step{title="Clone the repo"}
```
git clone https://github.com/andy-oneforce/asios-platform-dev
```
::::

::::step{title="Install dependencies"}
Run the installer from the project root.

:::hint{type="warning"}
A nested hint — proves a block can render inside a step.
:::
::::

::::step{title="Build the site"}
```
node build.mjs
```
::::
:::::

## Cards

::::cards
:::card{title="Quick start"}
Get the site running locally in under a minute.
:::

:::card{title="Reference"}
Look up every block type and its attributes.
:::
::::

## Figure

:::figure{src="/images/asios-logo.png" alt="ASIOS logo" caption="The ASIOS logo, used as the figure's caption."}
:::

## Code Blocks

A fenced code block with a language for Shiki highlighting, a `title="..."` attribute, and a
`{2-4}` line-highlight range:

```js title="format-name.js" {2-4}
function formatName(user) {
  const { first, last } = user;
  const full = `${first} ${last}`.trim();
  return full || 'Anonymous';
}
```

A fenced code block using the `+`/`-` diff-line convention — the marker character is stripped
before highlighting and before the copy button's plain-text copy, and never appears as a rendered
line-number:

```js title="format-name.js"
function formatName(user) {
  const { first, last } = user;
- return `${first} ${last}`;
+ return `${first} ${last}`.trim();
}
```

## Prose Elements

A Markdown table:

| Block type | Source | Styled by |
|---|---|---|
| `block-hint` | `:::hint{type="..."}` container | `base.css` / `blocks.css` |
| `block-code` | fenced code with a language | `markdown.mjs` + Shiki |
| `kbd` | raw `<kbd>` HTML | `base.css` |

A blockquote:

> A salt provides a large set of keys for any given password, and an iteration count increases
> the cost of producing keys from a password, thereby also increasing the difficulty of attack.

A nested bulleted list:

- Block modes
  - CBC (the default)
  - CFB
  - CTR
- Padding schemes
  - Pkcs7 (the default)
  - ZeroPadding

A nested numbered list:

1. Install dependencies
   1. Run `npm install` from `APP/website-build/code/`
   2. Confirm `node_modules/` was created
2. Build the site
   1. Run `node build.mjs`
   2. Confirm the console reports exit `0`

Use <kbd>Cmd</kbd>+<kbd>K</kbd> to open the search dialog from anywhere on the site.

Markdown-it-footnote renders a footnote reference as a superscript link, and its definition in a
`section.footnotes` block at the end of the page[^1].

[^1]: This is the footnote's definition, rendered inside `section.footnotes` with a backref link
    to the reference above.

## Images

A `Figure` block, rendering a real light-theme image plus a build-time-generated dark variant,
with explicit `width`/`height` reserved for layout stability and click-to-zoom wired up:

:::figure{src="./assets/style-guide-figure.png" alt="Example figure" caption="An example figure with zoom and a dark variant."}
:::
