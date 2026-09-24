/**
 * Stamped CMS assemble — inject-only pairing of CmsHost + form models from one
 * stamped collection graph (CONTEXT.md). Package-default host/shell adapters
 * pick a field; they do not invent separate materialization paths.
 */

import type { CmsHost } from "@cms/core";
import type { FormTree } from "@cms/core/form-tree";
import {
	type FormModelsByCollection,
	projectSchemaFormModels,
} from "@cms/core/semantic";
import {
	type BuildFsHostFromStampedOptions,
	buildFsHostFromStampedCollections,
} from "./build-fs-host-from-stamped";

export type AssembleStampedCmsOptions = BuildFsHostFromStampedOptions & {
	/** Optional form trees keyed by collection (overlay / defineAstroCms). */
	readonly forms?: Readonly<Record<string, FormTree>>;
};

export type AssembleStampedCmsResult = {
	readonly host: CmsHost;
	readonly formModels: FormModelsByCollection;
};

/**
 * One injectable face: stamped collections → paired CmsHost + form models.
 */
export function assembleStampedCms(
	options: AssembleStampedCmsOptions,
): AssembleStampedCmsResult {
	const { forms, ...hostOptions } = options;
	const { host, stampedSchemas } =
		buildFsHostFromStampedCollections(hostOptions);
	const formModels = projectSchemaFormModels(stampedSchemas, { forms });
	return { host, formModels };
}
