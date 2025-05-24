const path = require('path')
const { defineConfig } = require('vite')
import dts from 'vite-plugin-dts'

module.exports = defineConfig({
	root: './',
	publicDir: false,
	base: './',
	build: {
		lib: {
			// Single entry point for the library
			entry: path.resolve(__dirname, './src/index.ts'),
			name: 'index',
			// Generate both ESM and UMD formats
			formats: ['es'],
			fileName: (format) => `index.${format}.js`,
		},
		rollupOptions: {
			// External dependencies that should not be bundled
			external: ['react', 'react-dom', 'zustand'],
			output: {
				// Global variable names for UMD build
				globals: {
					react: 'React',
					'react-dom': 'ReactDOM',
					zustand: 'zustand'
				}
			},
			plugins: [
				dts({
					insertTypesEntry: true,
					outDir: './dist',
					rollupTypes: true,
					entryRoot: './src',
					tsconfigPath: './tsconfig.json'
				})
			],
		},
		outDir: './dist',
		emptyOutDir: true,
		sourcemap: true,
		minify: true,
	},
})
