/**
 * `@cms/astro/generate` — IR → native content.config emitter + generate CLI API.
 *
 * Layering: Node-only. Imports `@cms/core/semantic` only (no authoring UI).
 * Schema partition load never evaluates host Svelte editor modules.
 */

export { atomicWriteFile } from "./atomic-write";
export {
	type EmitContentConfigOptions,
	emitContentConfig,
} from "./emit-content-config";
export {
	type GenerateContentConfigOptions,
	type GenerateContentConfigResult,
	generateContentConfig,
} from "./generate-content-config";
export {
	extractEmbeddedHash,
	HASH_MARKER,
	sha256OfFiles,
} from "./hash";
export {
	loadSchemaPartition,
	SCHEMA_PARTITION_CONVENTION,
	type SchemaPartitionExport,
} from "./load-schema-partition";
