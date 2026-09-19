import { defineConfig } from 'vitest/config';

import * as path from 'path';



export default defineConfig({
	resolve: {
		alias: {
			'@': path.resolve(import.meta.dirname, './src'),
		},
	},
	test: {
		globals: true,
		environment: 'node',
		deps: {
			interopDefault: false,
		},
		include: [
			'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
		],
		reporters: [
			['verbose', { summary: true }],
		],

		// onStackTrace(error, frame) {
		//   return false // Blocks the stack trace from printing
		// },
	},
});
