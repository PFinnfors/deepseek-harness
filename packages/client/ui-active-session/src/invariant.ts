/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-active-session`.
 * @module @deepseek-ai/dsh-client-ui-active-session/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-active-session'

/** Cordis companion plugin name. */
export const name = 'client-ui-active-session-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: a pure-consumer plugin registering a presentational
 * component into the ui-sidebar-declared sidebar.workspaces slot plus its
 * locale dictionary — its inject face is stateless RPC wrappers; it emits no
 * cordis events and owns no cross-plugin mutable state. The Active state is
 * browser-local and resets with the view.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
