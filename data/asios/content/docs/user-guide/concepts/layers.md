---
title: Layers
description: Who may change a piece of content, and where it ships — the one idea that organizes everything ASIOS holds.
---

ASIOS organizes everything it holds into **layers**. A layer answers two questions about any given
piece of content: *who is expected to change it*, and *where does it ship*. Once you know a thing's
layer, both questions answer themselves — you don't need a separate rulebook per folder.

## The layer order

Layers run in one fixed order, from the broadest thing that ships to the one thing that never
does:

**Platform → Brand → Account → System → Support → App → User → Import → Export**

- **Platform** installs and updates a Workspace from the outside — it runs before a Workspace
  exists, and again after every update pulled in from the wider system.
- **Brand**, **Account**, and **System** narrow that down: white-label identity and server
  topology, then org-level governance, then the actual running ontology for one Workspace — its
  apps, its schemas, its day-boards.
- **Support** and **App** hold tenant-specific overrides and the individual apps a Workspace
  bundles.
- **User** is the one layer that never ships anywhere else. It's everything about *you* — your
  own work, your own notes, your own history — kept separate from anything the Platform installs
  or updates.
- **Import** and **Export** are the boundary layers: raw data arriving from outside in its exact
  form, and data being shared back out.

## Why this replaced "who's allowed to touch it"

Earlier, ASIOS organized content by *what kind of thing it was* — was this a task, a person, a
message — and layered a separate set of ownership rules on top. The two ideas didn't line up
cleanly, so the boundary that actually mattered day to day (who owns this, where does it ship) had
to be redrawn by hand across dozens of scattered rules.

Layers collapse that into one property that lives on the content itself. And critically, a layer
is no longer a **permission gate** — an activity isn't blocked from editing something because it
sits at a "lower" layer. Whatever activity is doing the work edits what it's dispatched against;
work only moves to a different activity when that activity needs to apply its own judgment, never
because of rank. The one check that still matters before any edit is a much simpler one: is
something else already mid-change here right now? That's a concurrency question, not an authority
one.

## What this buys you

Because a layer is a property of the content, not a folder full of special-case rules, moving a
file to a better location never breaks a reference to it — the reference still resolves, because
it was never pointing at the layer boundary in the first place. And because "who owns this" and
"where does it ship" are answered by the same one property, there's no second, separately
maintained map of the same boundary to keep in sync.
