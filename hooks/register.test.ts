import { expect, test } from 'claude-code/testing'

test('a finished gh pr merge leaves a reminder for the model', async ($, on) => {
  on('tool.call', () => ({ result: {} }))
  const ran = await $.tool.call({ tool: 'Bash', command: 'gh pr merge 12 --squash' })

  expect(JSON.stringify(ran)).toContain('open-items')
})

test('an auto-merge and other commands leave none', async ($, on) => {
  on('tool.call', () => ({ result: {} }))

  for (const command of ['gh pr merge 12 --auto --squash', 'gh pr view 12']) {
    const ran = await $.tool.call({ tool: 'Bash', command })
    expect(JSON.stringify(ran)).not.toContain('open-items')
  }
})

test('text that only mentions the command leaves none', async ($, on) => {
  on('tool.call', () => ({ result: {} }))
  const command = "cat > README.md <<'X'\nAfter a successful `gh pr merge`, a hook runs.\nX"
  const ran = await $.tool.call({ tool: 'Bash', command })

  expect(JSON.stringify(ran)).not.toContain('open-items')
})
