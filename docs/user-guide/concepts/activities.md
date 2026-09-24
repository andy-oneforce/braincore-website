
Every piece of tracked work in ASIOS — big or small — is an **activity**. An activity is identified
by one stable id, assigned the moment an idea is captured, and that same id is reused, unchanged,
by everything that grows out of it. There's no separate ledger mapping ids to work elsewhere; the
activity *is* the master record.

## From idea to activity

You don't create an activity by filling out a form. You drop an idea — a sentence, a task, a
question — into a capture surface, and the system:

1. assigns it a stable id,
2. spins up both an **activity** (the tracked-work record) and a **conversation** (the record of
   what was said about it), sharing that one id, and
3. immediately starts working it, rather than leaving it to sit until someone picks it up.

## Conversations happen inside activities

A **conversation** is the ongoing back-and-forth about an activity — your instructions, the
system's response, any open questions — and it lives *inside* that activity's own folder, not in
some separate inbox. Each turn is worked **in place**: you write what you want at the top of the
conversation file, the system acts on it and writes its answer back into that same top block, and
the *previous* turn is folded, unedited, into the activity's permanent history underneath. Nothing
about a turn is thrown away — it just moves from "current" to "history" as the next turn begins.

:::hint{type="info"}
A **Conversation** is the whole back-and-forth; a **Message** is one turn in it. When people talk
about "dispatching" something, they mean acting on the current top block of a Message.
:::

## Status: a small, honest set

An activity's status is always one of three values:

- **Active** — live work someone is actually driving right now.
- **Hold** — recently idle, still open, but out of the active view.
- **Closed** — done, or idle long enough that it's no longer worth tracking as open work. Closing
  doesn't delete anything; the activity's folder and history stay exactly where they are.

Status changes by hand, on purpose — nothing quietly ages from Active to Hold to Closed on a
timer. The one exception is *reopening*: dispatching a Hold or Closed activity again always brings
it back to Active first, so picking an old conversation back up is never a dead end.

## Why one id, not several

Because the activity id is the master id for everything that grows out of it — its conversation,
and any plan or project it later escalates into — nothing needs a separate cross-reference table
to find "the work behind this conversation" or "the conversation behind this task." The id you
started with is the id you'll still be using at the end.
