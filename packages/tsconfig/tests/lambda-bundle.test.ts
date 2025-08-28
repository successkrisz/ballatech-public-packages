import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { describe, expect, it } from 'vitest'

describe('lambda bundling for node22', () => {
	it('bundles and executes a minimal handler', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'lambda-bundle-'))
		try {
			const entry = join(dir, 'handler.ts')
			const outfile = join(dir, 'bundle.mjs')
			const handlerSource = `
				export interface Event { name: string }
				export const handler = async (event: Event) => {
					return { message: \`Hello, \${event.name}!\` }
				}
			`
			await writeFile(entry, handlerSource, 'utf8')

			await build({
				entryPoints: [entry],
				outfile,
				bundle: true,
				platform: 'node',
				format: 'esm',
				target: 'node22',
				sourcemap: false,
				logLevel: 'silent',
			})

			const mod = await import(pathToFileURL(outfile).href)
			const result = await mod.handler({ name: 'Lambda' })
			expect(result).toEqual({ message: 'Hello, Lambda!' })
		} finally {
			await rm(dir, { recursive: true, force: true })
		}
	})
})
