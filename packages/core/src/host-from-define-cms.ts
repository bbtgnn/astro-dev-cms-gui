/**
 * Sugar: {@link defineCms} result → {@link createCmsHost} with allowPaths
 * derived from collection bases.
 */
import {
	type CmsHost,
	type CreateCmsProtocolOptions,
	createCmsHost,
} from "./create-cms-protocol";
import type { DefineCmsResult } from "./define-cms";
import { nodeFsWriter } from "./node-fs-writer";
import type { Writer } from "./types";

export type HostFromDefineCmsOptions = {
	/** Absolute content root for the FS writer. */
	root: string;
	/** Defaults to {@link nodeFsWriter}. */
	writer?: Writer;
	capabilities?: CreateCmsProtocolOptions["capabilities"];
};

/**
 * Build a CmsHost from a portable {@link defineCms} config.
 * `allowPaths` is the unique set of collection `location.base` values.
 */
export function hostFromDefineCms(
	config: Pick<DefineCmsResult, "descriptors" | "schemas">,
	options: HostFromDefineCmsOptions,
): CmsHost {
	const allowPaths = [...new Set(config.descriptors.map((d) => d.base))];
	return createCmsHost({
		root: options.root,
		allowPaths,
		writer: options.writer ?? nodeFsWriter(),
		collections: config.descriptors,
		schemas: { ...config.schemas },
		...(options.capabilities !== undefined
			? { capabilities: options.capabilities }
			: {}),
	});
}
