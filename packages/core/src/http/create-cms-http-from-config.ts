import { type CmsHost, createCmsHost } from "../protocol/create-cms-protocol";
import type { CreateCmsHostConfig, Writer } from "../writer/types";
import {
	type CmsDispatcherOptions,
	createCmsDispatcher,
	DEFAULT_CMS_API_MOUNT,
} from "./dispatcher";

export type CreateCmsHttpFromConfigOptions = {
	readonly config: CreateCmsHostConfig;
	readonly root: string;
	readonly isDev: boolean;
	readonly allowInProd?: boolean;
	readonly mount?: string;
	readonly writer?: Writer;
};

export type CreateCmsHttpFromConfigResult = {
	readonly host: CmsHost;
	readonly dispatch: ReturnType<typeof createCmsDispatcher>;
};

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
