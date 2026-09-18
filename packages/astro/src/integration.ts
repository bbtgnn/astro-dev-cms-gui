/**
 * Astro host integration — consumer mount seam.
 *
 * Happy path (ADR-0016):
 *
 * ```ts
 * import { cms } from "@cms/astro";
 *
 * export default defineConfig({
 *   integrations: [svelte(), cms()],
 * });
 * ```
 *
 * Conventions: `src/cms.config.ts`, `src/content.config.ts`, `src/content/`.
 * Escape hatches: `editorConfig`, `hostModule`, `contentRoot`.
 *
 * Manual middleware (tests / advanced hosts) still lives on `@cms/routes`:
 * `createCmsMiddleware`. Pass `hostModule: false` with `protocol` + `isDev`
 * to expose `integration.middleware` for `defineMiddleware`.
 */
import { fileURLToPath } from "node:url";
import {
	type CmsDispatcherOptions,
	type CmsMiddlewareHandler,
	createCmsMiddleware,
} from "@cms/routes";
import {
	CMS_CONFIG_CONVENTION,
	type CmsVitePlugin,
	CONTENT_CONFIG_CONVENTION,
	cmsConfigVitePlugin,
	cmsContentConfigVitePlugin,
	cmsHostVitePlugin,
	cmsIntegrationOptionsVitePlugin,
	DEFAULT_CONTENT_ROOT,
	resolveConventionEntry,
	resolveProjectEntry,
} from "./vite-config-plugin";

export type CmsIntegrationOptions = {
	/**
	 * Browser-safe editor configuration module (project-relative or absolute).
	 * Defaults to `src/cms.config.{ts,mjs,js}` when present.
	 * Exposed to the client as `virtual:@cms/config`.
	 */
	editorConfig?: string;
	/**
	 * Project module that exports `createHost(): CmsHost`.
	 * When omitted, uses the package default host from `content.config` +
	 * `contentRoot`. Pass `false` to skip protocol middleware.
	 */
	hostModule?: string | false;
	/**
	 * Write-back root relative to the project (or absolute).
	 * Defaults to `src/content`. Used by the package default host only.
	 */
	contentRoot?: string;
	/**
	 * Browser path for the authoring shell page.
	 * Defaults to `/cms` when an editor config is resolved; pass `false` to skip injectRoute.
	 */
	shellPath?: string | false;
} & Partial<CmsDispatcherOptions>;

/** Minimal Astro `astro:config:setup` hook params we use. */
type AstroConfigSetupParams = {
	config: { root: string | URL };
	updateConfig: (config: {
		vite?: {
			plugins?: unknown[];
		};
	}) => void;
	addMiddleware: (middleware: {
		entrypoint: string | URL;
		order: "pre" | "post";
	}) => void;
	injectRoute: (route: {
		pattern: string;
		entrypoint: string | URL;
		prerender?: boolean;
	}) => void;
};

export type CmsIntegration = {
	name: "@cms/astro";
	/** Mount prefix without trailing slash (default `/_cms`). */
	mount: string;
	/** Shell page pattern when injectRoute runs; omitted when skipped. */
	shellPath?: string;
	/**
	 * Pass to `defineMiddleware(...)` when `hostModule: false` and
	 * `protocol` / `isDev` were provided. Omitted when auto-mounting.
	 */
	middleware?: CmsMiddlewareHandler;
	hooks?: {
		"astro:config:setup"?: (
			params: AstroConfigSetupParams,
		) => void | Promise<void>;
	};
};

function projectRootFromAstroConfig(root: string | URL): string {
	if (typeof root === "string") return root;
	return fileURLToPath(root);
}

function normalizeShellPath(shellPath: string): string {
	const trimmed = shellPath.replace(/\/+$/, "");
	return trimmed.startsWith("/") ? trimmed || "/" : `/${trimmed}`;
}

function defaultHostEntry(): string {
	return fileURLToPath(new URL("./default-host.ts", import.meta.url));
}

/**
 * Named install object for the Astro host surface.
 * - Resolves `src/cms.config.*` (or `editorConfig`) → `virtual:@cms/config` + `/cms`.
 * - Resolves default or project host → Astro `addMiddleware` for `/_cms`.
 * - With `hostModule: false` + `protocol`: exposes `middleware` for manual mount.
 */
export function createCmsIntegration(
	options: CmsIntegrationOptions = {},
): CmsIntegration {
	const mount = (options.mount ?? "/_cms").replace(/\/+$/, "") || "/_cms";
	const allowInProd = options.allowInProd;
	const shellPathOption = options.shellPath;

	const integration: CmsIntegration = {
		name: "@cms/astro",
		mount,
	};

	if (
		options.hostModule === false &&
		options.protocol != null &&
		options.isDev != null
	) {
		integration.middleware = createCmsMiddleware({
			protocol: options.protocol,
			readAsset: options.readAsset,
			isDev: options.isDev,
			allowInProd: options.allowInProd,
			mount,
		});
	}

	// Optimistic shellPath before setup resolves convention files (tests / docs).
	if (shellPathOption === false) {
		// leave unset
	} else if (shellPathOption != null) {
		integration.shellPath = normalizeShellPath(shellPathOption);
	} else {
		integration.shellPath = "/cms";
	}

	integration.hooks = {
		"astro:config:setup"({ config, updateConfig, addMiddleware, injectRoute }) {
			const root = projectRootFromAstroConfig(config.root);

			const editorConfigEntry =
				options.editorConfig != null
					? resolveProjectEntry(options.editorConfig, root)
					: resolveConventionEntry(root, CMS_CONFIG_CONVENTION);

			const contentConfigEntry = resolveConventionEntry(
				root,
				CONTENT_CONFIG_CONVENTION,
			);

			const useProjectHost =
				typeof options.hostModule === "string" && options.hostModule.length > 0;
			const useDefaultHost =
				options.hostModule == null && contentConfigEntry != null;
			const hostEntry = useProjectHost
				? resolveProjectEntry(options.hostModule as string, root)
				: useDefaultHost
					? defaultHostEntry()
					: undefined;

			const contentRoot = resolveProjectEntry(
				options.contentRoot ?? DEFAULT_CONTENT_ROOT,
				root,
			);

			const resolvedShellPath =
				shellPathOption === false
					? undefined
					: shellPathOption != null
						? normalizeShellPath(shellPathOption)
						: editorConfigEntry != null
							? "/cms"
							: undefined;

			if (resolvedShellPath != null) {
				integration.shellPath = resolvedShellPath;
			} else {
				delete integration.shellPath;
			}

			const plugins: CmsVitePlugin[] = [];

			if (editorConfigEntry != null) {
				plugins.push(cmsConfigVitePlugin({ entry: editorConfigEntry }));
			}

			if (hostEntry != null || resolvedShellPath != null) {
				plugins.push(
					cmsIntegrationOptionsVitePlugin({
						mount,
						allowInProd,
						contentRoot,
					}),
				);
			}

			if (useDefaultHost && contentConfigEntry != null) {
				plugins.push(cmsContentConfigVitePlugin({ entry: contentConfigEntry }));
			}

			if (hostEntry != null) {
				plugins.push(cmsHostVitePlugin({ entry: hostEntry }));
				addMiddleware({
					order: "pre",
					entrypoint: new URL("./middleware-entry.ts", import.meta.url),
				});
			}

			if (resolvedShellPath != null) {
				injectRoute({
					pattern: resolvedShellPath,
					entrypoint: new URL("./shell-page.astro", import.meta.url),
					prerender: false,
				});
			}

			if (plugins.length > 0) {
				updateConfig({
					vite: {
						plugins,
					},
				});
			}
		},
	};

	return integration;
}

/** Short alias for {@link createCmsIntegration}. */
export const cms = createCmsIntegration;
