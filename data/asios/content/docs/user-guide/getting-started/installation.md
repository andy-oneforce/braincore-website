---
title: Installation
description: How the Platform installs a Workspace, step by step.
---

ASIOS separates the **Platform** — the part that installs and updates things — from the
**Workspace** it installs. You never build a Workspace by hand; the Platform does it, and does it
the same way every time.

:::::stepper
::::step{title="Pull the Platform"}
The Platform distributes as a clean release channel with no history — a snapshot of everything
except your own personal layer, so a fresh install starts from a known-good state.

```
git clone <your-platform-distribution-remote>
```
::::

::::step{title="Let the Platform run"}
The Platform runs from *outside* the Workspace, before a Workspace exists and right after a pull.
It reads its own control definitions and brings the Workspace up to date — creating anything
missing, updating anything that changed.

:::hint{type="warning"}
Don't skip this step by copying files in manually. The Platform's install step is what keeps a
Workspace consistent across machines — a hand-copied Workspace tends to drift.
:::
::::

::::step{title="Confirm your Workspace is live"}
Once installed, your Workspace is the running system you actually work in day to day — capturing
ideas, working conversations, building things. Everything about *you* — your own work, your own
notes — lives inside it, in the one part of the tree that never ships anywhere else.
::::
:::::

## What "installed" means

A successful install leaves you with a Workspace that:

- has its own private layer, separate from anything the Platform ships or updates,
- can receive Platform updates without losing anything in that private layer, and
- is ready to capture the first idea — covered next, in [First steps](./first-steps.md).
