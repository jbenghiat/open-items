# open-items

A Claude Code mod that keeps one open-items checklist page per project.

`/open-items` publishes the page on the first run and stores its link in `intent/open-items.url`. Every later run updates that same page, so the link never changes and your ticks and notes carry over. On each refresh Claude reads the page's database first and applies the items you ticked to the project's spec open-items table, the plan's Progress rows and the memory files, using your note as the record. It then adds new open items and marks resolved ones done. Outward steps (YouTrack changes, pushes, pull requests) are never done for you; a tick that implies one comes back as a question in the report.

After a successful `gh pr merge`, a hook adds a reminder for Claude to run `/open-items` if the project has an `intent/open-items.url` file.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install open-items --marketplace <owner>/<repo>
```

From a shell:

```
claude plugin install open-items --marketplace <owner>/<repo>
```

## Use

Run `/open-items` (the skill is named `open-items:open-items`). The page needs the Artifact tool and its `db` capability, so it works where Claude can publish artifacts.

## Files

- `skills/open-items/SKILL.md`: the refresh procedure Claude follows.
- `skills/open-items/page.html`: the page. Bump `PAGE_VERSION` in `SKILL.md` whenever it changes.
- `hooks/register.ts`: the post-merge reminder, with tests in `hooks/register.test.ts`.

## License

MIT. See `LICENSE`.
