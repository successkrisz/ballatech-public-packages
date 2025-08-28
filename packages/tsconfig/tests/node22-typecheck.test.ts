import { execFile as _execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { build } from 'esbuild'
import { describe, expect, it } from 'vitest'

const execFile = promisify(_execFile)

const tscBin = join(
	process.cwd(),
	'node_modules',
	'.bin',
	process.platform === 'win32' ? 'tsc.cmd' : 'tsc',
)
const repoTsconfigNode22 = join(process.cwd(), 'packages', 'tsconfig', 'tsconfig.node22.json')

describe('tsconfig.node22 typechecking alongside esbuild transpilation', () => {
	it('typechecks valid code successfully', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'node22-typecheck-valid-'))
		try {
			const entry = join(dir, 'index.ts')
			const out = join(dir, 'out.mjs')
			const tsconfigPath = join(dir, 'tsconfig.json')

			const source = `
        import { readFile } from 'node:fs/promises'

        export async function readSelf(path: string): Promise<number> {
          const buf = await readFile(path)
          return buf.byteLength
        }
      `
			await writeFile(entry, source, 'utf8')

			await writeFile(
				tsconfigPath,
				JSON.stringify({
					extends: repoTsconfigNode22,
					include: ['**/*.ts'],
					compilerOptions: {
						typeRoots: [join(process.cwd(), 'packages', 'tsconfig', 'node_modules', '@types')],
					},
				}),
				'utf8',
			)

			await build({
				entryPoints: [entry],
				outfile: out,
				bundle: true,
				platform: 'node',
				format: 'esm',
				target: 'node22',
				sourcemap: false,
				logLevel: 'silent',
			})

			const { stdout, stderr } = await execFile(tscBin, ['--noEmit', '--project', tsconfigPath])
			expect(stderr).toBe('')
			// tsc success typically produces no output; presence of this line means success
			expect(typeof stdout).toBe('string')
		} finally {
			await rm(dir, { recursive: true, force: true })
		}
	})

	it('fails typecheck for invalid TS while esbuild still transpiles', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'node22-typecheck-invalid-'))
		try {
			const entry = join(dir, 'index.ts')
			const out = join(dir, 'out.mjs')
			const tsconfigPath = join(dir, 'tsconfig.json')

			const badSource = `
        export const n: number = 'not a number'
        export const fn = (x: string) => x.length
        // Intentional error: wrong argument type (no assertion bypass)
        fn(123)
      `
			await writeFile(entry, badSource, 'utf8')

			await writeFile(
				tsconfigPath,
				JSON.stringify({
					extends: repoTsconfigNode22,
					include: ['**/*.ts'],
					compilerOptions: {
						typeRoots: [join(process.cwd(), 'node_modules', '@types')],
					},
				}),
				'utf8',
			)

			// esbuild should still transpile without caring about types
			await build({
				entryPoints: [entry],
				outfile: out,
				bundle: true,
				platform: 'node',
				format: 'esm',
				target: 'node22',
				sourcemap: false,
				logLevel: 'silent',
			})

			let failed = false
			try {
				await execFile(tscBin, ['--noEmit', '--project', tsconfigPath])
			} catch (err: unknown) {
				failed = true
				// tsc non-zero exit includes diagnostics in stdout
				interface ExecError {
					stdout?: string | Buffer
					stderr?: string | Buffer
				}
				let output = ''
				if (err && typeof err === 'object') {
					const e = err as ExecError
					const out = e.stdout
					const errOut = e.stderr
					output = `${typeof out === 'string' ? out : out ? out.toString('utf8') : ''}${typeof errOut === 'string' ? errOut : errOut ? errOut.toString('utf8') : ''}`
				}
				expect(output).toMatch(/error TS\d+/)
			}
			expect(failed).toBe(true)
		} finally {
			await rm(dir, { recursive: true, force: true })
		}
	})
})
