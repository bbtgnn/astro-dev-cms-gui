/**
 * Co-located module URL for workspace `.ts` and published `.js` layouts.
 * Non-TS siblings (`.astro`, `.svelte`, …) keep their extension.
 */
export function colocatedUrl(importMetaUrl: string, relativePath: string): URL {
	const selfExt = importMetaUrl.match(/\.[^./?#]+(?=[?#]|$)/)?.[0];
	let sibling = relativePath;
	if (selfExt === ".js" && sibling.endsWith(".ts")) {
		sibling = `${sibling.slice(0, -".ts".length)}.js`;
	}
	return new URL(sibling, importMetaUrl);
}
