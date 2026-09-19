// scripts/copy-assets.mjs
import { cp } from 'node:fs/promises';

const assets = [
	['src/views', 'dist/views'],
	['public', 'dist/public'],
];

for (const [source, destination] of assets) {
	await cp(source, destination, {
		recursive: true,
	});
}