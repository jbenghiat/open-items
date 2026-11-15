---
name: open-items
description: Create or refresh this project's open-items checklist page. Publishes the page on the first run, then keeps one artifact up to date: applies the items the user ticked to the spec, plan and memory files, and syncs new and resolved items into the page's database. Use for /open-items, and after a PR merge when intent/open-items.url exists.
argument-hint: "[nothing needed]"
---

# Open-items checklist

One checklist per project, one artifact, one link that never changes. The page lives at the URL stored in `intent/open-items.url` (first line, nothing else). The page code is `${CLAUDE_SKILL_DIR}/page.html`. Its data lives in the artifact's database (read and write it with the `ArtifactData` tool; load it with ToolSearch `select:ArtifactData` if it is deferred).

PAGE_VERSION = 1 (bump it in this file whenever page.html changes).

## Rules that never bend

- A tick is the user's approval for **local edits only**: the spec's open-items table, the plan's Progress rows, and the project's memory files. Apply those without asking, and report them.
- **Outward steps need an explicit ask.** YouTrack state changes, comments or new issues, pushes, PRs: never do them here. If a ticked item implies one (a `BD-` ref, "close", "merge", "file"), list it as a question in the report.
- Do not commit. Leave the local edits in the working tree for the user to review.
- Never delete an item. Never clear or overwrite a user's note: append `Claude: ...` on a new line instead.
- Pin every ArtifactData write with `if_version` from the document you just listed. On a version conflict, re-list that document and redo the write; do not overwrite.
- Data changes go through ArtifactData only. Republish the page only when the page code changed (step 4).

## Data model

Collection `items`, one doc per item, stable ids `<group>-<slug>` (for example `spec-31`, `live-select-linked`; lowercase, hyphens):

| field | meaning |
| --- | --- |
| group | `spec`, `live`, `bugs`, `tooling` or `house` |
| order | number, sort key within the group (use steps of 10) |
| text | the item, one sentence |
| hint | optional, one short line of how to check it |
| refs | array of chips such as `"#31"`, `"§9.4"`, `"BD-1719"` |
| source | where it comes from, such as `plan Progress row 7` or `memory: project_palette.md` |
| done | bool, written by the page when the user ticks, or by you when a source records it resolved |
| doneAt | `YYYY-MM-DD` or `""` |
| note | string, the user's note or yours |
| applied | bool, written only by you: the local edits for a tick have been applied (or the item was resolved by you) |

Document `meta/page`: `{ title, eyebrow, lede, pageVersion }`. The page shows title, eyebrow and lede in its header. Title: `<Project> open items`. Eyebrow: `<project> · <plan path> · <branch> @ <short sha>`. Update the eyebrow on every refresh.

## First run (no `intent/open-items.url`)

1. Find the project root (`git worktree list`, first entry is the main checkout; the project name is its folder name). If a worktree has no `intent/open-items.url` but the main checkout does, use the main checkout's.
2. Read `${CLAUDE_SKILL_DIR}/page.html` in full, then publish it with the Artifact tool: `file_path` that file, `capabilities: {"db": {}}`, `icon: "checklist"`, `description` one sentence naming the project. Do not pass `url`.
3. Write the returned URL as the only line of `intent/open-items.url` (create `intent/` if needed). Tell the user the file is new and not committed.
4. Set `meta/page` (title, eyebrow, lede left to the page default unless the project needs its own, `pageVersion: 1`).
5. Go to step 2 of the refresh below and seed the items.
6. Verify: one `ArtifactData` `list` of `items`, and confirm the seed is there. Say in one line what you checked.

If a project already has a page from before this skill existed, put its URL in `intent/open-items.url` and run the refresh. Read the artifact first (Artifact tool, `action: "read"`) so a republish is allowed, and expect step 4 to republish it because it has no `meta/page.pageVersion`.

## Refresh (every later run)

Read the URL from `intent/open-items.url`. If the file is missing, run the first-run procedure.

### 1. Apply what the user ticked

`ArtifactData` `list` of `items` (page with `query.limit`/`cursor` until done). Then:

- **Newly ticked** = `done: true` and `applied` is not `true`. For each, make the matching local edits, using the item's `note` as the record of what was decided:
  - the spec's open-items table (find the spec the plan points to; mark the row done or settled, with the date and the note);
  - the plan's Progress rows in `intent/plans/*.md` (update the row that names the check);
  - the project's memory files (the memory directory named in your system prompt): fix or remove the matching "Open" / "Still open" line, and note the decision if it is worth keeping.
  Then set `applied: true` on the item. If you cannot tell which edit an item means, leave `applied` unset and ask.
- **Reopened** = `done: false` and `applied: true`. The user unticked it. Do not revert the local edits; list it in the report and set `applied: false`.
- Collect every outward step the ticks imply and hold them for the report.

### 2. Gather the current open items

- the plan's Progress rows (`intent/plans/*.md`) that still name open checks;
- the spec's open-items table, rows not marked done or settled;
- "Open" / "Still open" lines in the project's memory files;
- open `mcp__open-items__track` entries, if that MCP server is connected (ToolSearch for `open-items`); if it is not, say it was skipped.

Map each to a group: `spec` (spec open items), `live` (checks to run in the real app), `bugs` (behavior to look at), `tooling` (tooling and ~ai-config), `house` (housekeeping).

### 3. Sync the db in one batch

Build one `ArtifactData` `batch` (50 writes at most per batch; use several if needed), each write pinned with `if_version`:

- **New** (no doc with that id): `set` with all fields, `done: false`, `doneAt: ""`, `note: ""`, no `applied`. Never re-add an item that already exists under another id: match on refs and text first.
- **Resolved** (doc exists, `done: false`, `applied` absent, and its source now records it resolved): `update` with `done: true`, `doneAt: <today>`, `applied: true`, and a note. If the note is empty it is `Claude: <where it is recorded resolved>`; if the user wrote one, append `\nClaude: <where>`. An item the user reopened (`applied: false`) is never ticked by you again.
- **Applied ticks** from step 1: `update` with `applied: true`.
- **Gone from the sources but still open**: leave it alone and list it in the report.
- `meta/page`: `update` the eyebrow.

### 4. Republish only if the page code changed

Compare `meta/page.pageVersion` with PAGE_VERSION above. If they differ: read page.html in full, publish it with the Artifact tool using the stored `url` (no `icon`, no new `capabilities`), then `update` `meta/page.pageVersion`. If they match, do not touch the page.

### 5. Report

Short, in this order, omitting empty parts:

1. **Applied from your ticks**: item → file edited → what changed.
2. **Added / marked done** by this refresh.
3. **Reopened or gone from the sources**, for the user to look at.
4. **Questions** (outward steps a tick implies; nothing was done): one line each, for example "BD-1719 ticked: move it to Fixed in YouTrack?".
5. The page link and `done / total`.
