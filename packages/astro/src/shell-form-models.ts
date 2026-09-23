/**
 * Astro SSR seam: project stamped content.config schemas (+ optional overlay)
 * to serializable form models for the client shell (ADR-0008 — browser never
 * imports content.config).
 */

import {
	type FormModelsByCollection,
	type SchemaFormOverlay,
	projectSchemaFormModels,
} from "@cms/core/semantic";
import { overlays } from "virtual:@cms/config";
import { collections } from "virtual:@cms/content-config";
import {
	type StampedCollectionConfig,
	collectionsFromContentConfigExport,
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
		overlays: overlays as Readonly<Record<string, SchemaFormOverlay>>,
	});
}
