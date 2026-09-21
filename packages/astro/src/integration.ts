/**
 * Astro host integration — consumer mount seam (ADR-0016 / 0019 / 0020).
 *
 * Happy path:
 *
 * ```ts
 * import { cms } from "@cms/astro";
 *
 * export default defineConfig({
 *   integrations: [svelte(), cms()],
 * });
 * ```
 *
 * Conventions: `src/cms.config.ts` (required), optional `src/cms.components.ts`,
 * generated `src/content.config.ts`, content under `src/content/`.
 * Package default CmsHost is the built-in FS adapter; virtual IDs stay internal.
 *
 * Tests / non-convention layouts: {@link cmsHarness} from `@cms/astro/testing`.
 * Protocol-only: {@link createCmsMiddleware} from `@cms/astro`.
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
	cmsHostVitePlugin,
	cmsIntegrationOptionsVitePlugin,
	DEFAULT_CONTENT_ROOT,
	resolveConventionEntry,
	resolveProjectEntry,
} from "./vite-config-plugin";

/** Product install — no options. See {@link cmsHarness} for escapes. */
export type CmsIntegrationOptions = Record<string, never>;

/**
 * Test / advanced-layout escapes. Not the consumer install face.
 * Prefer conventions + {@link cms} whenever possible.
 */
export type CmsHarnessOptions = {
	/**
	 * Editor configuration module (project-relative or absolute).
	 * Defaults to `src/cms.config.*` when present.
	 * Required for a useful harness; missing config with `requireConfig: true`
	 * (product `cms()`) hard-fails.
	 */
	config?: string;
	/**
	 * Vite-only components catalog. Defaults to `src/cms.components.*` when
	 * present; omit/`false` → empty catalog.
	 */
	componentsCatalog?: string | false;
	/**
	 * Project module exporting `createHost(): CmsHost`.
	 * - omit → package default CmsHost (requires resolved config)
	 * - string → that module
	 * - `false` → skip protocol middleware / host virtual
	 */
	host?: string | false;
	/** Write-back root. Defaults to `src/content`. */
	contentRoot?: string;
	/** Shell page pattern. Defaults to `/cms` when config resolves; `false` skips. */
	shellPath?: string | false;
	/** When `false`, skip content.config generation. */
	generate?: false;
	/** Mount prefix for `/_cms`. */
	mount?: string;
	allowInProd?: boolean;
	/**
	 * Product mode: hard-fail in setup when editor configuration is missing.
	 * {@link cms} sets this; harness defaults to false.
	 */
	requireConfig?: boolean;
} & Partial<Pick<CmsDispatcherOptions, "protocol" | "isDev" | "readAsset">>;

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
	 * Pass to `defineMiddleware(...)` when harness uses `host: false` and
	 * `protocol` / `isDev` were provided.
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

function missingConfigMessage(projectRoot: string): string {
	const expected = CMS_CONFIG_CONVENTION.map((p) => `  - ${p}`).join("\n");
	return [
		`@cms/astro: cms() requires editor configuration under the project root.`,
		`Looked in ${projectRoot} for:`,
		expected,
		`Add src/cms.config.ts (ADR-0016 / 0019), or use cmsHarness from @cms/astro/testing for fixtures.`,
	].join("\n");
}

/**
 * Shared install wiring. Product callers use {@link cms}; tests use
 * {@link cmsHarness}.
 */
export function createCmsIntegration(
	options: CmsHarnessOptions = {},
): CmsIntegration {
	const mount = (options.mount ?? "/_cms").replace(/\/+$/, "") || "/_cms";
	const allowInProd = options.allowInProd;
	const shellPathOption = options.shellPath;
	const requireConfig = options.requireConfig === true;

	const integration: CmsIntegration = {
		name: "@cms/astro",
		mount,
	};

	if (
		options.host === false &&
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

			const configEntry =
				options.config != null
					? resolveProjectEntry(options.config, root)
					: resolveConventionEntry(root, CMS_CONFIG_CONVENTION);

			if (requireConfig && configEntry == null) {
				throw new Error(missingConfigMessage(root));
			}

			if (options.generate !== false) {
				await runContentConfigGeneration({
					projectRoot: root,
					schemaPartition: configEntry ?? false,
				});
			}

			const componentsEntry =
				options.componentsCatalog === false
					? undefined
					: options.componentsCatalog != null
						? resolveProjectEntry(options.componentsCatalog, root)
						: resolveConventionEntry(root, CMS_COMPONENTS_CONVENTION);

			// Resolve after generation so a missing committed bootstrap is
			// created in-hook when config exists.
			void resolveConventionEntry(root, CONTENT_CONFIG_CONVENTION);

			const useProjectHost =
				typeof options.host === "string" && options.host.length > 0;
			const useDefaultHost = options.host == null && configEntry != null;
			const hostEntry = useProjectHost
				? resolveProjectEntry(options.host as string, root)
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
						: configEntry != null
							? "/cms"
							: undefined;

			if (resolvedShellPath != null) {
				integration.shellPath = resolvedShellPath;
			} else {
				delete integration.shellPath;
			}

			const plugins: CmsVitePlugin[] = [];

			if (configEntry != null) {
				plugins.push(cmsConfigVitePlugin({ entry: configEntry }));
			}

			if (configEntry != null || resolvedShellPath != null) {
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

/**
 * Convention-first install — zero options.
 * Requires `src/cms.config.ts` (hard-fail in `astro:config:setup` if missing).
 */
export function cms(): CmsIntegration {
	return createCmsIntegration({ requireConfig: true });
}

/**
 * Escapes for fixtures and non-convention layouts.
 * Prefer {@link cms} for real hosts.
 */
export function cmsHarness(options: CmsHarnessOptions = {}): CmsIntegration {
	return createCmsIntegration({ ...options, requireConfig: false });
}
