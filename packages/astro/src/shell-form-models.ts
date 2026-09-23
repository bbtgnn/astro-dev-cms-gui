/**
 * Astro SSR seam: project stamped content.config schemas (+ optional form tree)
 * to serializable form models for the client shell (ADR-0008 — browser never
 * imports content.config).
 */

import { forms } from "virtual:@cms/config";
import { collections } from "virtual:@cms/content-config";
import {
	type FormModelsByCollection,
	projectSchemaFormModels,
} from "@cms/core/semantic";
import type { FormTree } from "@cms/core/form-tree";
import {
	collectionsFromContentConfigExport,
	type StampedCollectionConfig,
} from "./build-fs-host-from-stamped";

export { getPreviewUrl } from "virtual:@cms/config";

export function loadShellFormModels(): FormModelsByCollection {
	const stamped = collectionsFromContentConfigExport({
		collections: collections as Readonly<
			Record<string, StampedCollectionConfig>
		>,
	});
	const schemas: Record<string, (typeof stamped)[string]["schema"]> = {};
	for (const [name, config] of Object.entries(stamped)) {
		schemas[name] = config.schema;
	}
	return projectSchemaFormModels(schemas, {
		forms: forms as Readonly<Record<string, FormTree>>,
	});
}
