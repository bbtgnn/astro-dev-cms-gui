/**
 * Proxy assets: resolved paths/URLs for the loaders shim and stamp-helpers.
 * Owns src vs dist layout knowledge for the Vite boot inject.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type ProxyAssets = {
	loaders: string;
	stampHelpersHref: string;
};

function contentProxyRoots(base: string): string[] {
	return [
		// Running from src/content-proxy/*.ts (bun / direct source).
		base,
		// Bundled layout — assets under content-proxy/.
		join(base, "content-proxy"),
	];
}

function pickExisting(candidates: string[], label: string): string {
	const hit = candidates.find((p) => existsSync(p));
	if (!hit) {
		throw new Error(
			`@cms/astro content-proxy ${label} missing (tried ${candidates.join(", ")}).`,
		);
	}
	return hit;
}

export function proxyAssets(): ProxyAssets {
	const base = dirname(fileURLToPath(import.meta.url));
	const roots = contentProxyRoots(base);

	const loaders = pickExisting(
		roots.flatMap((root) => [
			join(root, "shims", "astro-loaders.js"),
			join(root, "shims", "astro-loaders.ts"),
		]),
		"shim astro-loaders",
	);

	const stampHelpers = pickExisting(
		roots.flatMap((root) => [
			join(root, "stamp-helpers.js"),
			join(root, "stamp-helpers.ts"),
		]),
		"stamp-helpers",
	);

	return {
		loaders,
		stampHelpersHref: pathToFileURL(stampHelpers).href,
	};
}
