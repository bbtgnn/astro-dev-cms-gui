import { existsSync, statSync } from "node:fs";
import path from "node:path";

export type PackageJson = {
	name?: string;
	version?: string;
	private?: boolean;
	exports?: unknown;
	files?: string[];
	bin?: string | Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	scripts?: unknown;
	[key: string]: unknown;
};

type PublishExport = {
	types?: string;
	import: string;
	svelte?: string;
	default?: string;
};

export type PublishFaceOptions = {
	readonly packageName: string;
	readonly catalog: Readonly<Record<string, string>>;
	readonly workspaceVersion: (name: string) => string;
	readonly svelteCondition?: boolean;
};

function rewriteDeps(
	deps: Record<string, string> | undefined,
	options: PublishFaceOptions,
): Record<string, string> | undefined {
	if (!deps) return undefined;
	const out: Record<string, string> = {};
	for (const [depName, spec] of Object.entries(deps)) {
		if (spec === "workspace:*") {
			out[depName] = options.workspaceVersion(depName);
			continue;
		}
		if (spec.startsWith("workspace:")) {
			out[depName] = options.workspaceVersion(spec.slice("workspace:".length));
			continue;
		}
		if (spec === "catalog:" || spec.startsWith("catalog:")) {
			const key = spec === "catalog:" ? depName : spec.slice("catalog:".length);
			const range = options.catalog[key];
			if (!range) throw new Error(`No catalog entry for ${key}`);
			out[depName] = range;
			continue;
		}
		out[depName] = spec;
	}
	return out;
}

function workspaceSrcExports(
	exportsField: unknown,
	pkgLabel: string,
): Record<string, string> {
	if (
		!exportsField ||
		typeof exportsField !== "object" ||
		Array.isArray(exportsField)
	) {
		throw new Error(
			`${pkgLabel}: exports must be a map of ./src/* string paths`,
		);
	}
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(exportsField)) {
		if (typeof value !== "string") {
			throw new Error(
				`${pkgLabel} export "${key}": expected string path, got ${typeof value}`,
			);
		}
		if (!value.startsWith("./src/")) {
			throw new Error(
				`${pkgLabel} export "${key}": expected ./src/*, got ${value}`,
			);
		}
		if (
			!value.endsWith(".ts") &&
			!value.endsWith(".astro") &&
			!value.endsWith(".svelte")
		) {
			throw new Error(
				`${pkgLabel} export "${key}": expected ./src/*.{ts,astro,svelte}, got ${value}`,
			);
		}
		out[key] = value;
	}
	return out;
}

function publishExportsFromSrc(
	srcExports: Record<string, string>,
	options: Pick<PublishFaceOptions, "svelteCondition">,
): Record<string, PublishExport> {
	const out: Record<string, PublishExport> = {};
	for (const [key, srcPath] of Object.entries(srcExports)) {
		if (srcPath.endsWith(".astro")) {
			const distPath = `./dist/${srcPath.slice("./src/".length)}`;
			out[key] = { import: distPath, default: distPath };
			continue;
		}
		if (srcPath.endsWith(".svelte")) {
			const distPath = `./dist/${srcPath.slice("./src/".length)}`;
			out[key] = { svelte: distPath, import: distPath, default: distPath };
			continue;
		}
		const base = `./dist/${srcPath.slice("./src/".length, -".ts".length)}`;
		const entry: PublishExport = {
			types: `${base}.d.ts`,
			import: `${base}.js`,
		};
		if (options.svelteCondition) entry.svelte = `${base}.js`;
		out[key] = entry;
	}
	return out;
}

function rewriteBinPath(binPath: string): string {
	if (binPath.startsWith("./src/") && binPath.endsWith(".ts")) {
		return `./dist/${binPath.slice("./src/".length, -".ts".length)}.js`;
	}
	throw new Error(
		`publish bin must be ./src/*.ts (got ${binPath}); point package.json bin at src`,
	);
}

function rewriteBin(bin: PackageJson["bin"]): PackageJson["bin"] | undefined {
	if (bin == null) return undefined;
	if (typeof bin === "string") return rewriteBinPath(bin);
	return Object.fromEntries(
		Object.entries(bin).map(([name, binPath]) => [
			name,
			rewriteBinPath(binPath),
		]),
	);
}

/** Derive a consumer-visible manifest from a package's workspace manifest. */
export function createPublishFace(
	workspacePkg: PackageJson,
	options: PublishFaceOptions,
): PackageJson {
	const pkg: PackageJson = { ...workspacePkg };
	pkg.private = false;
	pkg.files = ["dist"];
	pkg.exports = publishExportsFromSrc(
		workspaceSrcExports(workspacePkg.exports, options.packageName),
		options,
	);
	pkg.dependencies = rewriteDeps(pkg.dependencies, options);
	pkg.peerDependencies = rewriteDeps(pkg.peerDependencies, options);
	const bin = rewriteBin(workspacePkg.bin);
	if (bin != null) pkg.bin = bin;
	delete pkg.devDependencies;
	delete pkg.scripts;
	return pkg;
}

function publishTargets(value: unknown, label: string): string[] {
	if (typeof value === "string") return [value];
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(
			`${label}: expected publish target string or condition map`,
		);
	}
	return Object.entries(value).flatMap(([condition, target]) =>
		publishTargets(target, `${label} condition "${condition}"`),
	);
}

function assertDistTarget(
	distDir: string,
	target: string,
	label: string,
): void {
	if (!target.startsWith("./dist/")) {
		throw new Error(`${label}: expected target under ./dist, got ${target}`);
	}
	const resolved = path.resolve(distDir, target.slice("./dist/".length));
	if (
		path.relative(distDir, resolved).startsWith("..") ||
		!existsSync(resolved)
	) {
		throw new Error(`${label}: missing staged target ${target}`);
	}
	if (!statSync(resolved).isFile()) {
		throw new Error(`${label}: staged target is not a file ${target}`);
	}
}

/** Assert that every consumer-visible export and bin resolves inside staged dist. */
export function assertPublishFace(distDir: string, pkg: PackageJson): void {
	const label = pkg.name ?? "package";
	if (
		!pkg.exports ||
		typeof pkg.exports !== "object" ||
		Array.isArray(pkg.exports)
	) {
		throw new Error(`${label}: publish exports must be a map`);
	}
	for (const [key, value] of Object.entries(pkg.exports)) {
		for (const target of publishTargets(value, `${label} export "${key}"`)) {
			assertDistTarget(distDir, target, `${label} export "${key}"`);
		}
	}
	const bins = typeof pkg.bin === "string" ? { [label]: pkg.bin } : pkg.bin;
	for (const [name, target] of Object.entries(bins ?? {})) {
		assertDistTarget(distDir, target, `${label} bin "${name}"`);
	}
}
