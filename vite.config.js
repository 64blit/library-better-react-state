const path = require('path')
const { defineConfig } = require('vite')
import esbuild from 'rollup-plugin-esbuild'
import del from 'rollup-plugin-delete'

module.exports = defineConfig({
	root: './',
	publicDir: false,
	base: './',
	build: {
		lib: {
			// Could also be a dictionary or array of multiple entry points
			entry: path.resolve(__dirname, './src/AppStore.ts'),
			name: 'AppStore',
			// the proper extensions will be added
			fileName: (format) => `do-you-zunderstand.${format}.js`,
		},
		rollupOptions: {
			browser: true,
			main: true,
			// external: ['three', 'camera-controls'],
			plugins: [
				del({ ignore: [ 'dist/*.js', 'dist/*.map' ], targets: 'dist/*', hook: 'generateBundle' }),
				esbuild(),
			],
			sourcemap: true,
		},
		outDir: './dist',
		emptyOutDir: true,
		sourcemap: true,
		minify: true,
	},
})
