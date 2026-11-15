import type { Register } from 'claude-code'

// A hook cannot publish an artifact, so after a merge it only reminds Claude
// to run the open-items skill. It stays quiet for `--auto` (nothing merged yet)
// and for a merge that failed.
// Only a command that starts with it: at the start, or after a newline, `;`, `&` or `|`.
// Text that merely mentions it (a heredoc, a grep, an echo) does not count.
const MERGE_COMMAND = /(^|[\n;&|]\s*)gh\s+pr\s+merge\b/
const AUTO_FLAG = /(^|\s)--auto(\s|=|$)/

const REMINDER =
  'A pull request was just merged. If this project keeps an open-items checklist ' +
  '(intent/open-items.url exists), run the open-items skill (/open-items) as part of ' +
  'the post-merge cleanup, after the branch and worktree are removed, so the list picks ' +
  'up what the merge resolved. If intent/open-items.url does not exist, do nothing.'

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError === true) return ran
    if (!MERGE_COMMAND.test(e.command) || AUTO_FLAG.test(e.command)) return ran

    return { ...ran, context: [...(ran.context ?? []), REMINDER] }
  }).catch(($, e, next) => next(e))
}
