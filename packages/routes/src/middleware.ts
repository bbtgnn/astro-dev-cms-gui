/**
 * Consumer mount seam.
 *
 * Preferred:
 *
 * ```ts
 * import { createCmsIntegration } from "@cms/routes";
 *
 * export default defineConfig({
 *   integrations: [
 *     createCmsIntegration({
 *       editorConfig: "./src/cms/editor-config.ts",
 *       hostModule: "./src/cms/host.ts", // exports createHost(): CmsHost
 *       // shellPath: "/cms" (default when editorConfig is set; false to skip)
 *     }),
 *   ],
 * });
 * ```
 *
 * Manual middleware (tests / advanced hosts):
 *
 * ```ts
 * import { defineMiddleware } from "astro:middleware";
 * import { createCmsMiddleware } from "@cms/routes";
 *
 * export const onRequest = defineMiddleware(
 *   createCmsMiddleware({ protocol, isDev: import.meta.env.DEV, mount: "/_cms" }),
 * );
 * ```
 *
 * Astro ignores `src/pages/_…`, so `/_cms` stays middleware-mounted.
 * The authoring shell HTML is injectRoute'd (default `/cms`).
 */
import { fileURLToPath } from "node:url";
import { type CmsDispatcherOptions, createCmsDispatcher } from "./dispatcher";
import {
	type CmsVitePlugin,
	cmsConfigVitePlugin,
	cmsHostVitePlugin,
	cmsIntegrationOptionsVitePlugin,
	resolveProjectEntry,
} from "./vite-config-plugin";

/** Minimal Astro middleware context shape (avoid importing astro:middleware here). */
export type CmsMiddlewareContext = {
	request: Request;
	url: URL;
};

export type CmsMiddlewareNext = () => Promise<Response> | Response;

export type CmsMiddlewareHandler = (
	context: CmsMiddlewareContext,
	next: CmsMiddlewareNext,
) => Promise<Response>;

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
	updateConfig: (config: { vite?: { plugins?: unknown[] } }) => void;
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
	name: "@cms/routes";
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

export function createCmsMiddleware(
	options: CmsDispatcherOptions,
): CmsMiddlewareHandler {
	const mount = (options.mount ?? "/_cms").replace(/\/+$/, "") || "/_cms";
	const dispatch = createCmsDispatcher({ ...options, mount });

	return async function cmsMiddleware(context, next) {
		const { pathname } = context.url;
		if (pathname !== mount && !pathname.startsWith(`${mount}/`)) {
			return await next();
		}

		const rest = pathname.slice(mount.length).replace(/^\//, "");
		const segments = rest.length ? rest.split("/") : [];
		return dispatch(context.request, segments);
	};
}

function projectRootFromAstroConfig(root: string | URL): string {
	if (typeof root === "string") return root;
	return fileURLToPath(root);
}

function normalizeShellPath(shellPath: string): string {
	const trimmed = shellPath.replace(/\/+$/, "");
	return trimmed.startsWith("/") ? trimmed || "/" : `/${trimmed}`;
}

/**
 * Named install object for the consumer surface.
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
		name: "@cms/routes",
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
						entrypoint: new URL("./astro-middleware.ts", import.meta.url),
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
	}

	return integration;
}
