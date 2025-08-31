const esbuild = require('esbuild')

esbuild
	.build({
		entryPoints: ['server.ts'],
		bundle: true,
		platform: 'node',
		target: 'node22',
		external: ['node:stream'],
		outfile: 'build/lambda/index.cjs',
		sourcemap: true,
		format: 'cjs',
		// Minify: true,
		// treeShaking: true,
		metafile: true,
		legalComments: 'none',
	})
	.catch((error) => {
		console.error('Build failed:', error)
		throw error
	})
