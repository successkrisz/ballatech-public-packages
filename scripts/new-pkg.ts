import { Args, Command, Options } from '@effect/cli'
import { FileSystem, Path } from '@effect/platform'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import { Console, Effect, Option } from 'effect'

const nameArg = Args.text({ name: 'package-name' }).pipe(Args.withDescription('Package name'))
const scopeOpt = Options.text('scope').pipe(
	Options.withDescription('Package scope (default: @ballatech)'),
	Options.optional,
)
const Cwd = Effect.sync(() => process.cwd())

const newPackage = Command.make('new', { name: nameArg, scope: scopeOpt }, ({ name, scope }) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem
		const path = yield* Path.Path
		const rawName = name
		const resolvedScope = scope.pipe(Option.getOrElse(() => '@ballatech'))
		const pkgDir = path.join(yield* Cwd, 'packages', rawName)

		if (yield* fs.exists(pkgDir)) {
			return yield* Effect.fail(new Error(`Package directory already exists: ${pkgDir}`))
		}

		yield* fs.makeDirectory(pkgDir, { recursive: true })
		yield* fs.makeDirectory(path.join(pkgDir, 'src'), { recursive: true })

		const fullName = `${resolvedScope}/${rawName}`

		const pkgJson = {
			name: fullName,
			version: '0.1.0',
			private: false,
			license: 'MIT',
			sideEffects: false,
			type: 'module',
			main: './dist/index.js',
			module: './dist/index.js',
			types: './dist/index.d.ts',
			exports: {
				'.': {
					types: './dist/index.d.ts',
					import: './dist/index.js',
				},
			},
			files: ['dist/**', 'README.md', 'LICENSE'],
			scripts: {
				build: 'tsup',
				prepack: 'pnpm run build',
			},
			devDependencies: {
				'@effect/platform': 'catalog:',
				effect: 'catalog:',
			},
			peerDependencies: {
				'@effect/platform': 'catalog:',
				effect: 'catalog:',
			},
			repository: {
				type: 'git',
				url: 'git+https://github.com/successkrisz/ballatech-public-packages.git',
				directory: `packages/${rawName}`,
			},
			bugs: {
				url: 'https://github.com/successkrisz/ballatech-public-packages/issues',
			},
			homepage: 'https://github.com/successkrisz/ballatech-public-packages#readme',
		}

		const tsupConfig = `import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	skipNodeModulesBundle: true,
	treeshake: true,
})
`

		const tsconfig = {
			extends: '../tsconfig/tsconfig.base.json',
			compilerOptions: { outDir: 'dist' },
			include: ['src'],
		}

		const indexTs = `export const name = '${fullName}'
`

		const readme = `# ${fullName}

Package scaffolded via scripts/new-pkg.ts
`

		yield* fs.writeFileString(
			path.join(pkgDir, 'package.json'),
			`${JSON.stringify(pkgJson, null, '\t')}\n`,
		)
		yield* fs.writeFileString(path.join(pkgDir, 'tsup.config.ts'), tsupConfig)
		yield* fs.writeFileString(
			path.join(pkgDir, 'tsconfig.json'),
			`${JSON.stringify(tsconfig, null, '\t')}\n`,
		)
		yield* fs.writeFileString(path.join(pkgDir, 'src', 'index.ts'), indexTs)
		yield* fs.writeFileString(path.join(pkgDir, 'README.md'), readme)

		yield* Console.log(`Created package at ${pkgDir}`)
		yield* Console.log('Next steps:')
		yield* Console.log(`  - pnpm -C ${pkgDir} build`)
		yield* Console.log('  - pnpm changeset (to queue a release)')
	}),
)

const run = Command.run(newPackage, {
	name: '@ballatech/new',
	version: '0.0.0',
})
const main = run(process.argv).pipe(
	Effect.catchTag('MissingValue', () =>
		Console.log('Usage: pnpm new <package-name> [--scope @ballatech]'),
	),
	Effect.provide(NodeContext.layer),
)
NodeRuntime.runMain(main)
