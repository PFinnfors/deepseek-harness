/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-theme-background`.
 * @module @deepseek-ai/dsh-client-ui-theme-background/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-theme-background'

/** Cordis companion plugin name. */
export const name = 'client-ui-theme-background-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the settings section, token override, background
 * stylesheet, and brand occupant are effects owned and observed by their
 * respective registries; the transient panel source is exercised through its
 * public observable contract.
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
