/**
 * Consumer mount seam.
 *
 * Middleware (protocol transport):
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
 * Vite editor config (astro.config integrations):
 *
 * ```ts
 * import { createCmsIntegration } from "@cms/routes";
 *
 * export default defineConfig({
 *   integrations: [
 *     createCmsIntegration({ editorConfig: "./src/cms/editor-config.ts" }),
 *   ],
 * });
 * ```
 *
 * Astro ignores `src/pages/_…`, so `/_cms` stays middleware-mounted.
 * Full `addMiddleware` via Astro hooks remains deferred (#15).
 */
import { fileURLToPath } from "node:url";
import { type CmsDispatcherOptions, createCmsDispatcher } from "./dispatcher";
import {
	cmsConfigVitePlugin,
	resolveEditorConfigEntry,
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
} & Partial<CmsDispatcherOptions>;

/** Minimal Astro `astro:config:setup` hook params we use. */
type AstroConfigSetupParams = {
	config: { root: string | URL };
	updateConfig: (config: { vite?: { plugins?: unknown[] } }) => void;
};

export type CmsIntegration = {
	name: "@cms/routes";
	/** Mount prefix without trailing slash (default `/_cms`). */
	mount: string;
	/**
	 * Pass to `defineMiddleware(...)` when `protocol` was provided.
	 * Omitted when the integration is Vite-config-only.
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

/**
 * Named install object for the consumer surface.
 * - With `editorConfig`: registers the `virtual:@cms/config` Vite plugin.
 * - With `protocol`: exposes `middleware` for `defineMiddleware`.
 */
export function createCmsIntegration(
	options: CmsIntegrationOptions = {},
): CmsIntegration {
	const mount = (options.mount ?? "/_cms").replace(/\/+$/, "") || "/_cms";
	const integration: CmsIntegration = {
		name: "@cms/routes",
		mount,
	};

	if (options.protocol != null && options.isDev != null) {
		integration.middleware = createCmsMiddleware({
			protocol: options.protocol,
			isDev: options.isDev,
			allowInProd: options.allowInProd,
			mount,
		});
	}

	if (options.editorConfig) {
		const editorConfig = options.editorConfig;
		integration.hooks = {
			"astro:config:setup"({ config, updateConfig }) {
				const root = projectRootFromAstroConfig(config.root);
				const entry = resolveEditorConfigEntry(editorConfig, root);
				updateConfig({
					vite: {
						plugins: [cmsConfigVitePlugin({ entry })],
					},
				});
			},
		};
	}

	return integration;
}
