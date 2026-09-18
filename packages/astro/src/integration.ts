/**
 * Astro host integration — consumer mount seam.
 *
 * ```ts
 * import { cms } from "@cms/astro";
 *
 * export default defineConfig({
 *   integrations: [
 *     svelte(),
 *     cms({
 *       editorConfig: "./src/cms/editor-config.ts",
 *       hostModule: "./src/cms/host.ts", // exports createHost(): CmsHost
 *     }),
 *   ],
 * });
 * ```
 *
 * Manual middleware (tests / advanced hosts) still lives on `@cms/routes`:
 * `createCmsMiddleware`.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	type CmsDispatcherOptions,
	type CmsMiddlewareHandler,
	createCmsMiddleware,
} from "@cms/routes";
import {
	type CmsVitePlugin,
	cmsConfigVitePlugin,
	cmsHostVitePlugin,
	cmsIntegrationOptionsVitePlugin,
	resolveProjectEntry,
} from "./vite-config-plugin";

export type CmsIntegrationOptions = {
	/**
	 * Browser-safe editor configuration module (project-relative or absolute).
	 * Exposed to the client as `virtual:@cms/config`.
	 */
	editorConfig?: string;
	/**
	 * Project module that exports `createHost(): CmsHost`.
	 * When set, registers Astro middleware that mounts the CMS protocol transport.
	 */
	hostModule?: string;
	/**
	 * Browser path for the authoring shell page.
	 * Defaults to `/cms` when `editorConfig` is set; pass `false` to skip injectRoute.
	 */
	shellPath?: string | false;
} & Partial<CmsDispatcherOptions>;

/** Minimal Astro `astro:config:setup` hook params we use. */
type AstroConfigSetupParams = {
	config: { root: string | URL };
	updateConfig: (config: {
		vite?: {
			plugins?: unknown[];
			server?: { fs?: { allow?: string[] } };
			ssr?: { noExternal?: Array<string | RegExp> };
			optimizeDeps?: { exclude?: string[] };
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
	 * Pass to `defineMiddleware(...)` when `protocol` was provided without
	 * `hostModule`. Omitted when the integration auto-mounts via `addMiddleware`.
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

/** This package root + sibling workspace packages (Vite FS allowlist). */
function workspaceFsAllow(projectRoot: string): string[] {
	const packageRoot = fileURLToPath(new URL("..", import.meta.url));
	const packagesDir = path.dirname(packageRoot);
	return [projectRoot, packageRoot, packagesDir];
}

/**
 * Named install object for the Astro host surface.
 * - With `editorConfig`: registers `virtual:@cms/config` and (by default) injects `/cms`.
 * - With `hostModule`: registers host/options virtuals + Astro `addMiddleware`.
 * - With `protocol` (no `hostModule`): exposes `middleware` for manual
 *   `defineMiddleware` (tests / advanced hosts).
 */
export function createCmsIntegration(
	options: CmsIntegrationOptions = {},
): CmsIntegration {
	const mount = (options.mount ?? "/_cms").replace(/\/+$/, "") || "/_cms";
	const editorConfig = options.editorConfig;
	const hostModule = options.hostModule;
	const allowInProd = options.allowInProd;

	const shellPathOption = options.shellPath;
	const resolvedShellPath =
		shellPathOption === false
			? undefined
			: shellPathOption != null
				? normalizeShellPath(shellPathOption)
				: editorConfig != null
					? "/cms"
					: undefined;

	const integration: CmsIntegration = {
		name: "@cms/astro",
		mount,
		...(resolvedShellPath != null ? { shellPath: resolvedShellPath } : {}),
	};

	if (
		options.hostModule == null &&
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

	if (editorConfig != null || hostModule != null || resolvedShellPath != null) {
		integration.hooks = {
			"astro:config:setup"({
				config,
				updateConfig,
				addMiddleware,
				injectRoute,
			}) {
				const root = projectRootFromAstroConfig(config.root);
				const plugins: CmsVitePlugin[] = [];

				if (editorConfig != null) {
					plugins.push(
						cmsConfigVitePlugin({
							entry: resolveProjectEntry(editorConfig, root),
						}),
					);
				}

				if (hostModule != null || resolvedShellPath != null) {
					plugins.push(cmsIntegrationOptionsVitePlugin({ mount, allowInProd }));
				}

				if (hostModule != null) {
					plugins.push(
						cmsHostVitePlugin({
							entry: resolveProjectEntry(hostModule, root),
						}),
					);
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

				updateConfig({
					vite: {
						...(plugins.length > 0 ? { plugins } : {}),
						// Workspace @cms/* packages ship TypeScript source via exports.
						// Process them in Vite instead of Node-resolving bare relative imports.
						ssr: {
							noExternal: [/^@cms\//],
						},
						optimizeDeps: {
							exclude: [
								"@cms/astro",
								"@cms/authoring",
								"@cms/components",
								"@cms/crud",
								"@cms/fields",
								"@cms/form",
								"@cms/routes",
							],
						},
						server: {
							fs: {
								allow: workspaceFsAllow(root),
							},
						},
					},
				});
			},
		};
	}

	return integration;
}

/** Short alias for {@link createCmsIntegration}. */
export const cms = createCmsIntegration;
