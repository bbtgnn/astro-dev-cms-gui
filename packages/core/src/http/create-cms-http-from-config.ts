/**
 * Portable CMS HTTP from the createCmsHost `config` door (defineCms result).
 * Returns paired CmsHost + dispatcher; framework adapters supply path segments.
 */

import { type CmsHost, createCmsHost } from "../create-cms-protocol";
import type { CreateCmsHostConfig, Writer } from "../types";
import {
	type CmsDispatcherOptions,
	createCmsDispatcher,
	DEFAULT_CMS_API_MOUNT,
} from "./dispatcher";

export type CreateCmsHttpFromConfigOptions = {
	/** Same `config` door as {@link createCmsHost} (e.g. {@link defineCms} result). */
	readonly config: CreateCmsHostConfig;
	readonly root: string;
	readonly isDev: boolean;
	readonly allowInProd?: boolean;
	/** Mount prefix without trailing slash; default {@link DEFAULT_CMS_API_MOUNT}. */
	readonly mount?: string;
	/** Defaults like {@link createCmsHost} (node FS Writer). */
	readonly writer?: Writer;
};

export type CreateCmsHttpFromConfigResult = {
	readonly host: CmsHost;
	readonly dispatch: ReturnType<typeof createCmsDispatcher>;
};

/**
 * One injectable face: defineCms-shaped config → CmsHost + HTTP dispatcher.
 */
export function createCmsHttpFromConfig(
	options: CreateCmsHttpFromConfigOptions,
): CreateCmsHttpFromConfigResult {
	const {
		config,
		root,
		isDev,
		allowInProd,
		mount = DEFAULT_CMS_API_MOUNT,
		writer,
	} = options;

	const host = createCmsHost({
		root,
		config,
		...(writer !== undefined ? { writer } : {}),
	});

	const dispatcherOptions: CmsDispatcherOptions = {
		host,
		isDev,
		mount,
		...(allowInProd !== undefined ? { allowInProd } : {}),
	};

	return {
		host,
		dispatch: createCmsDispatcher(dispatcherOptions),
	};
}
