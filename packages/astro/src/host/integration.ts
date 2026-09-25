/**
 * Astro host integration — consumer mount seam (schema-first overlay exploration).
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
 * Conventions: user-authored `src/content.config.ts` (required), optional
 * `src/cms.config.ts` / `src/cms.components.ts` overlay, content under
 * `src/content/`. Product `cms()` installs content-proxy stamps, never
 * generates `content.config`.
 *
 * Tests / non-convention layouts: {@link cmsHarness} from `@cms/astro/testing`.
 * Protocol-only: {@link createCmsMiddleware} from `@cms/astro`.
 */
import { fileURLToPath } from "node:url";
import { cmsCollectionTypesVitePlugin } from "../codegen/vite-collection-types-plugin";
import { viteAliasesForBoot, vitePluginsForBoot } from "../content-proxy/boot";
import {
	type CmsDispatcherOptions,
	type CmsMiddlewareHandler,
	createCmsMiddleware,
	DEFAULT_CMS_API_MOUNT,
} from "../http";
import { colocatedUrl } from "../module-sibling";
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
	DEFAULT_CONTENT_ROOT,
	resolveConventionEntry,
	resolveProjectEntry,
} from "./vite-config-plugin";

export type CmsIntegrationOptions = Record<string, never>;

/**
 * Test / advanced-layout escapes. Not the consumer install face.
 * Prefer conventions + {@link cms} whenever possible.
 */
export type CmsHarnessOptions = {
	config?: string;
	componentsCatalog?: string | false;
	/**
	 * Project module exporting `createHost(): CmsHost`.
	 * - omit → package default CmsHost (requires resolved content.config)
	 * - string → that module
	 * - `false` → skip protocol route / host virtual
	 */
	host?: string | false;
	contentRoot?: string;
	shellPath?: string | false;
	mount?: string;
	allowInProd?: boolean;
	/**
	 * Product mode: hard-fail in setup when `src/content.config.*` is missing.
	 * {@link cms} sets this; harness defaults to false.
	 */
	requireContentConfig?: boolean;
} & Partial<Pick<CmsDispatcherOptions, "protocol" | "isDev" | "readAsset">>;

type AstroConfigSetupParams = {
	config: { root: string | URL };
	updateConfig: (config: {
		vite?: {
			plugins?: unknown[];
			resolve?: { alias?: unknown };
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
	mount: string;
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
	return fileURLToPath(colocatedUrl(import.meta.url, "./default-host.ts"));
}

function missingContentConfigMessage(projectRoot: string): string {
	const expected = CONTENT_CONFIG_CONVENTION.map((p) => `  - ${p}`).join("\n");
	return [
		`@cms/astro: cms() requires src/content.config.* under the project root.`,
		`Looked in ${projectRoot} for:`,
		expected,
		`Author Astro collections there (schema-first). Overlay cms.config is optional.`,
		`Use cmsHarness from @cms/astro/testing for fixtures without content.config.`,
	].join("\n");
}

export function createCmsIntegration(
	options: CmsHarnessOptions = {},
): CmsIntegration {
	const mount =
		(options.mount ?? DEFAULT_CMS_API_MOUNT).replace(/\/+$/, "") ||
		DEFAULT_CMS_API_MOUNT;
	const allowInProd = options.allowInProd;
	const shellPathOption = options.shellPath;
	const requireContentConfig = options.requireContentConfig === true;

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
	if (shellPathOption !== false) {
		integration.shellPath =
			shellPathOption != null ? normalizeShellPath(shellPathOption) : "/cms";
	}

	integration.hooks = {
		async "astro:config:setup"({ config, updateConfig, injectRoute }) {
			const root = projectRootFromAstroConfig(config.root);

			// Content-proxy must land before Content Layer evaluates content.config.
			// Plugin *array* order vs Astro’s content virtual-mod is not enough on its
			// own (both enforce:"pre"; Astro is registered earlier). The boot proxy
			// wins via resolveId hook `order: "pre"` + remapping `\0astro:content`.
			const proxyPlugins = vitePluginsForBoot() as unknown as CmsVitePlugin[];
			const proxyAliases = viteAliasesForBoot();

			const contentConfigEntry = resolveConventionEntry(
				root,
				CONTENT_CONFIG_CONVENTION,
			);

			if (requireContentConfig && contentConfigEntry == null) {
				throw new Error(missingContentConfigMessage(root));
			}

			const configEntry =
				options.config != null
					? resolveProjectEntry(options.config, root)
					: resolveConventionEntry(root, CMS_CONFIG_CONVENTION);

			const componentsEntry =
				options.componentsCatalog === false
					? undefined
					: options.componentsCatalog != null
						? resolveProjectEntry(options.componentsCatalog, root)
						: resolveConventionEntry(root, CMS_COMPONENTS_CONVENTION);

			const useProjectHost =
				typeof options.host === "string" && options.host.length > 0;
			const useDefaultHost = options.host == null && contentConfigEntry != null;
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
						: contentConfigEntry != null
							? "/cms"
							: undefined;

			if (resolvedShellPath != null) {
				integration.shellPath = resolvedShellPath;
			} else {
				delete integration.shellPath;
			}

			const plugins: CmsVitePlugin[] = [...proxyPlugins];

			if (contentConfigEntry != null) {
				plugins.push(cmsContentConfigVitePlugin({ entry: contentConfigEntry }));
				plugins.push(
					cmsCollectionTypesVitePlugin({
						projectRoot: root,
						contentConfigEntry,
					}),
				);
			}

			const needsShellVirtuals =
				contentConfigEntry != null ||
				resolvedShellPath != null ||
				hostEntry != null;

			if (needsShellVirtuals) {
				plugins.push(
					cmsConfigVitePlugin(
						configEntry != null ? { entry: configEntry } : {},
					),
				);
				plugins.push(cmsComponentsVitePlugin({ entry: componentsEntry }));
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
				injectRoute({
					pattern: `${mount}/[...path]`,
					entrypoint: colocatedUrl(import.meta.url, "./protocol-route.ts"),
					prerender: false,
				});
			}

			if (resolvedShellPath != null) {
				injectRoute({
					pattern: resolvedShellPath,
					entrypoint: colocatedUrl(import.meta.url, "./shell-page.astro"),
					prerender: false,
				});
			}

			updateConfig({
				vite: {
					plugins,
					resolve: {
						alias: proxyAliases,
					},
				},
			});
		},
	};

	return integration;
}

export function cms(): CmsIntegration {
	return createCmsIntegration({ requireContentConfig: true });
}

/**
 * Escapes for fixtures and non-convention layouts.
 * Prefer {@link cms} for real hosts. Overlay cms.config is always optional.
 */
export function cmsHarness(options: CmsHarnessOptions = {}): CmsIntegration {
	return createCmsIntegration({ ...options, requireContentConfig: false });
}
