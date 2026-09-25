import type { glob as AstroGlob, Loader } from "astro/loaders";

export const LOADER_STAMP = Symbol.for("@cms/astro.loaderStamp");

type AstroGlobOptions = Parameters<typeof AstroGlob>[0];

export type GlobLoaderStamp = {
	kind: "glob";
	pattern: AstroGlobOptions["pattern"];
	/** Normalized to string for host location join (Astro also allows URL). */
	base?: string;
};

export type FileLoaderStamp = {
	kind: "file";
	fileName: string;
};

export type LoaderStamp = GlobLoaderStamp | FileLoaderStamp;

export type StampedLoader = Loader & {
	[LOADER_STAMP]?: LoaderStamp;
};

export function getLoaderStamp(loader: unknown): LoaderStamp | undefined {
	if (!loader || typeof loader !== "object") return undefined;
	return (loader as StampedLoader)[LOADER_STAMP];
}

export function stampLoader<T extends Loader>(
	loader: T,
	stamp: LoaderStamp,
): T {
	(loader as StampedLoader)[LOADER_STAMP] = stamp;
	return loader;
}
