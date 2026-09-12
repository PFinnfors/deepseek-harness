#!/usr/bin/env node
import { existsSync, lstatSync, readFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { isAbsolute, join, resolve } from 'node:path'

const OWNERSHIP_MARKER = '.dsh-lefthook-owned'
const OWNERSHIP_MARKER_OWNER = 'deepseek-harness worktree-local lefthook hooks'
const OWNERSHIP_MARKER_VERSION = 1
const PAIRING_KEYS = [
  'merge.dsh-translation-pairing.name',
  'merge.dsh-translation-pairing.driver',
]

function git(args, options = {}) {
  const result = spawnSync('git', args, { encoding: 'utf8' })
  if (result.status !== 0 && !options.allowStatuses?.includes(result.status)) {
    const detail = result.stderr.trim() || `exit status ${String(result.status)}`
    throw new Error(`git ${args.join(' ')} failed: ${detail}`)
  }
  return result.stdout.trim()
}

function parseMarker(path) {
  if (!existsSync(path)) return undefined
  const stat = lstatSync(path)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) return undefined
  try {
    const marker = JSON.parse(readFileSync(path, 'utf8'))
    if (
      marker?.version !== OWNERSHIP_MARKER_VERSION
      || marker?.owner !== OWNERSHIP_MARKER_OWNER
      || typeof marker?.hooksPath !== 'string'
      || !isAbsolute(marker.hooksPath)
    ) return undefined
    return marker
  } catch {
    return undefined
  }
}

function main() {
  const root = git(['rev-parse', '--show-toplevel'])
  const gitDirectory = git(['rev-parse', '--absolute-git-dir'])
  const ownedHooksPath = join(gitDirectory, 'dsh-hooks')
  const configuredHooksPath = git(['config', '--worktree', '--get', 'core.hooksPath'], { allowStatuses: [1] })

  if (configuredHooksPath !== '') {
    const resolvedConfiguredPath = isAbsolute(configuredHooksPath)
      ? resolve(configuredHooksPath)
      : resolve(root, configuredHooksPath)
    if (resolvedConfiguredPath !== resolve(ownedHooksPath)) {
      throw new Error(`refusing to remove non-DSH worktree hook path ${JSON.stringify(configuredHooksPath)}`)
    }
    git(['config', '--worktree', '--unset-all', 'core.hooksPath'])
  }

  for (const key of PAIRING_KEYS) {
    git(['config', '--worktree', '--unset-all', key], { allowStatuses: [5] })
  }

  if (existsSync(ownedHooksPath)) {
    const hooksStat = lstatSync(ownedHooksPath)
    const marker = parseMarker(join(ownedHooksPath, OWNERSHIP_MARKER))
    if (!hooksStat.isDirectory() || hooksStat.isSymbolicLink() || marker?.hooksPath !== ownedHooksPath) {
      throw new Error(`refusing to remove unowned hooks directory ${JSON.stringify(ownedHooksPath)}`)
    }
    rmSync(ownedHooksPath, { recursive: true })
  }

  process.stdout.write('Removed DSH worktree hooks and translation merge-driver configuration.\n')
}

try {
  main()
} catch (error) {
  console.error(`[uninstall-lefthook] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
