/**
 * Astro host integration — consumer mount seam.
 *
 * Happy path (ADR-0016 / ADR-0019):
 *
 * ```ts
 * import { cms } from "@cms/astro";
 *
 * export default defineConfig({
 *   integrations: [svelte(), cms()],
 * });
 * ```
 *
 * Conventions: `src/cms.config.ts` (unified tree + generation partition),
 * optional `src/cms.components.ts` (Vite catalog) → generated
 * `src/content.config.ts`, `src/content/`.
 * Escape hatches: `editorConfig`, `hostModule`, `contentRoot`, `schemaPartition`.
 *
 * Generation runs in `astro:config:setup` (dev/sync/check/build) before Astro
 * evaluates `content.config.ts`. No mandatory host package.json wrappers.
 *
 * Manual middleware (tests / advanced hosts): `createCmsMiddleware` from
 * `@cms/astro`. Pass `hostModule: false` with `protocol` + `isDev`
 * to expose `integration.middleware` for `defineMiddleware`.
 */
import { fileURLToPath } from "node:url";
import { runContentConfigGeneration } from "./generate/run-content-config-generation";
import {
	type CmsDispatcherOptions,
	type CmsMiddlewareHandler,
	createCmsMiddleware,
} from "./http";
import {
	CMS_COMPONENTS_CONVENTION,
	CMS_CONFIG_CONVENTION,
	type CmsVitePlugin,
	CONTENT_CONFIG_CONVENTION,
	cmsComponentsVitePlugin,
	cmsConfigVitePlugin,
	cmsContentConfigVitePlugin,
	cmsHostVitePlugin,
	cmsIntegrationOptionsVitePlugin,
	cmsSchemaPartitionVitePlugin,
	DEFAULT_CONTENT_ROOT,
	resolveConventionEntry,
	resolveProjectEntry,
	SCHEMA_PARTITION_CONVENTION,
} from "./vite-config-plugin";

export type CmsIntegrationOptions = {
	/**
	 * Node-safe unified tree module (project-relative or absolute).
	 * Defaults to `src/cms.config.{ts,mjs,js}` when present.
	 * Exposed to the client as `virtual:@cms/config`.
	 */
	editorConfig?: string;
	/**
	 * Vite-only components catalog (project-relative or absolute).
	 * Defaults to `src/cms.components.{ts,mjs,js}` when present; otherwise an
	 * empty catalog. Exposed as `virtual:@cms/components`.
	 */
	componentsCatalog?: string | false;
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
	/**
	 * Svelte-free schema partition for content.config generation (ADR-0019).
	 * Defaults to `src/cms.config.ts` when present. Pass `false` to disable
	 * generation (tests / hosts that still hand-author content.config only).
	 */
	schemaPartition?: string | false;
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

function defaultHostEntry(mode: "semantic" | "legacy"): string {
	const file =
		mode === "semantic" ? "./default-host-semantic.ts" : "./default-host.ts";
	return fileURLToPath(new URL(file, import.meta.url));
}

/**
 * Named install object for the Astro host surface.
 * - Resolves `src/cms.config.*` (or `editorConfig`) → `virtual:@cms/config` + `/cms`.
 * - Resolves `src/cms.components.*` → `virtual:@cms/components` for binding lookup.
 * - When `src/cms.config.ts` (or `schemaPartition`) exists, regenerates
 *   `content.config.ts` in `astro:config:setup` before other wiring and uses
 *   the CMS-first default host (authoritative IR validator).
 * - Without a schema partition, falls back to live `content.config` discovery.
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
		async "astro:config:setup"({
			config,
			updateConfig,
			addMiddleware,
			injectRoute,
		}) {
			const root = projectRootFromAstroConfig(config.root);

			// Gate 4 / ADR-0019: regenerate before Astro evaluates content.config.
			// Key off setup completion — not a distinct "check" command string
			// (astro check still runs the content pipeline with command=sync).
			await runContentConfigGeneration({
				projectRoot: root,
				schemaPartition: options.schemaPartition,
			});

			const editorConfigEntry =
				options.editorConfig != null
					? resolveProjectEntry(options.editorConfig, root)
					: resolveConventionEntry(root, CMS_CONFIG_CONVENTION);

			const schemaPartitionEntry =
				options.schemaPartition === false
					? undefined
					: options.schemaPartition != null
						? resolveProjectEntry(options.schemaPartition, root)
						: resolveConventionEntry(root, SCHEMA_PARTITION_CONVENTION);

			const componentsEntry =
				options.componentsCatalog === false
					? undefined
					: options.componentsCatalog != null
						? resolveProjectEntry(options.componentsCatalog, root)
						: resolveConventionEntry(root, CMS_COMPONENTS_CONVENTION);

			// Resolve after generation so a missing committed bootstrap is
			// created in-hook and default-host wiring can see it.
			const contentConfigEntry = resolveConventionEntry(
				root,
				CONTENT_CONFIG_CONVENTION,
			);

			const useProjectHost =
				typeof options.hostModule === "string" && options.hostModule.length > 0;
			const useSemanticDefaultHost =
				options.hostModule == null && schemaPartitionEntry != null;
			const useLegacyDefaultHost =
				options.hostModule == null &&
				schemaPartitionEntry == null &&
				contentConfigEntry != null;
			const hostEntry = useProjectHost
				? resolveProjectEntry(options.hostModule as string, root)
				: useSemanticDefaultHost
					? defaultHostEntry("semantic")
					: useLegacyDefaultHost
						? defaultHostEntry("legacy")
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

			if (editorConfigEntry != null || resolvedShellPath != null) {
				plugins.push(cmsComponentsVitePlugin({ entry: componentsEntry }));
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

			if (useSemanticDefaultHost && schemaPartitionEntry != null) {
				plugins.push(
					cmsSchemaPartitionVitePlugin({ entry: schemaPartitionEntry }),
				);
			} else if (useLegacyDefaultHost && contentConfigEntry != null) {
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
