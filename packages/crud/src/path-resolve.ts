/**
 * Id ↔ YAML relpath helpers (ticket 11).
 * P1 still resolves via pathMap in write-mode; these helpers are the P2 seam.
 */
import path from "node:path";

export type YamlExtension = "yaml" | "yml";

export const DEFAULT_YAML_EXTENSION: YamlExtension = "yaml";

function normalizeFs(p: string): string {
	return path.resolve(p).replace(/\\/g, "/");
}

/** Refuse absolute ids, `..`, empty segments, and backslashes. */
export function assertSafeEntryId(id: string): void {
	if (!id || id.includes("\\") || id.startsWith("/") || path.isAbsolute(id)) {
		throw Object.assign(new Error(`Unsafe entry id: ${id}`), {
			status: 400,
			code: "UNSAFE_ID",
		});
	}
	const parts = id.split("/");
	if (parts.some((p) => !p || p === "." || p === "..")) {
		throw Object.assign(new Error(`Unsafe entry id: ${id}`), {
			status: 400,
			code: "UNSAFE_ID",
		});
	}
}

/** `id` → relative path under a collection base (`docs/intro` → `docs/intro.yaml`). */
export function entryRelPath(
	id: string,
	ext: YamlExtension = DEFAULT_YAML_EXTENSION,
): string {
	assertSafeEntryId(id);
	return `${id}.${ext}`;
}

/** Strip `.yaml` / `.yml`; returns null if not a YAML entry path. */
export function idFromRelPath(relPath: string): string | null {
	const normalized = relPath.replace(/\\/g, "/");
	if (normalized.endsWith(".yaml")) return normalized.slice(0, -".yaml".length);
	if (normalized.endsWith(".yml")) return normalized.slice(0, -".yml".length);
	return null;
}

/**
 * Minimal `{base}/{id}.{ext}` substitution only — no mini-language.
 * `base` may be empty (leading slash collapsed).
 */
export function applyPathTemplate(
	template: string,
	vars: { base: string; id: string; ext: string },
): string {
	const raw = template
		.replaceAll("{base}", vars.base)
		.replaceAll("{id}", vars.id)
		.replaceAll("{ext}", vars.ext);
	return raw.replace(/\/{2,}/g, "/").replace(/^\//, "");
}

export type ResolveYamlEntryOptions = {
	/** Prefer on create when neither file exists. Default `yaml`. */
	preferredExt?: YamlExtension;
	/**
	 * When true (default), return the preferred create path if neither exists.
	 * When false, return null if missing.
	 */
	forCreate?: boolean;
};

export type ResolvedYamlEntry = {
	absolutePath: string;
	ext: YamlExtension;
	/** True when neither `.yaml` nor `.yml` existed yet. */
	created: boolean;
};

async function pathExists(
	exists: (absolutePath: string) => Promise<boolean>,
	absolutePath: string,
): Promise<boolean> {
	return await exists(absolutePath);
}

/**
 * Resolve `(baseDir, id)` to an absolute YAML path.
 * Both `.yaml` and `.yml` present → error (no silent prefer).
 */
export async function resolveYamlEntryPath(
	exists: (absolutePath: string) => Promise<boolean>,
	baseDir: string,
	id: string,
	options: ResolveYamlEntryOptions = {},
): Promise<ResolvedYamlEntry | null> {
	assertSafeEntryId(id);
	const preferred = options.preferredExt ?? DEFAULT_YAML_EXTENSION;
	const forCreate = options.forCreate ?? true;

	const yamlAbs = normalizeFs(path.join(baseDir, `${id}.yaml`));
	const ymlAbs = normalizeFs(path.join(baseDir, `${id}.yml`));

	const hasYaml = await pathExists(exists, yamlAbs);
	const hasYml = await pathExists(exists, ymlAbs);

	if (hasYaml && hasYml) {
		throw Object.assign(
			new Error(`Ambiguous entry: both .yaml and .yml exist for id "${id}"`),
			{ status: 409, code: "YAML_EXT_COLLISION" },
		);
	}
	if (hasYaml) {
		return { absolutePath: yamlAbs, ext: "yaml", created: false };
	}
	if (hasYml) {
		return { absolutePath: ymlAbs, ext: "yml", created: false };
	}
	if (!forCreate) return null;

	const ext = preferred;
	return {
		absolutePath: normalizeFs(path.join(baseDir, `${id}.${ext}`)),
		ext,
		created: true,
	};
}

/**
 * If `absolutePath` is `.yaml`/`.yml`, error when the sibling extension also exists.
 */
export async function assertNoYamlExtCollision(
	exists: (absolutePath: string) => Promise<boolean>,
	absolutePath: string,
): Promise<void> {
	const normalized = normalizeFs(absolutePath);
	const lower = normalized.toLowerCase();
	let sibling: string | null = null;
	if (lower.endsWith(".yaml")) {
		sibling = `${normalized.slice(0, -".yaml".length)}.yml`;
	} else if (lower.endsWith(".yml")) {
		sibling = `${normalized.slice(0, -".yml".length)}.yaml`;
	}
	if (!sibling) return;

	const selfExists = await pathExists(exists, normalized);
	const siblingExists = await pathExists(exists, sibling);
	if (selfExists && siblingExists) {
		const id =
			idFromRelPath(path.basename(normalized)) ?? path.basename(normalized);
		throw Object.assign(
			new Error(`Ambiguous entry: both .yaml and .yml exist for id "${id}"`),
			{ status: 409, code: "YAML_EXT_COLLISION" },
		);
	}
}

/** Writer-backed exists probe (ENOENT → false). */
export function writerExists(
	readText: (path: string) => Promise<string>,
): (absolutePath: string) => Promise<boolean> {
	return async (absolutePath) => {
		try {
			await readText(absolutePath);
			return true;
		} catch {
			return false;
		}
	};
}
