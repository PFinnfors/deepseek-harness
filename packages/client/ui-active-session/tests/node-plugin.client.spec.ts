import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { apply } from '../src/index.ts'

let ctx: Context | undefined

afterEach(async () => {
  await ctx?.fiber.dispose()
  ctx = undefined
})

describe('ui-active-session node plugin', () => {
  it('mounts as an inert host placeholder adding no model-facing tool', async () => {
    ctx = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)

    await ctx.plugin({ apply }).await()

    // The browser half renders the sidebar region; the node half exists only
    // so the plugin row appears in the host Loader. Mounting a tool here
    // would surface it to every agent regardless of preset composition.
    expect(ctx.tools.get('active_session_toggle')).toBeUndefined()
    expect(ctx.tools.get('toggle_active_session')).toBeUndefined()
  })
})
