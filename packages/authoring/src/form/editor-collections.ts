/**
 * Package-private form-shell lowering → EditorCollections.
 * Not part of the public `@cms/authoring` mount face — hosts use
 * {@link authoringPropsFromFormModels} / {@link authoringPropsFromDefineCms}.
 * Schema projection, form-model walk, SJSF lowering, and catalog binding stay
 * implementation (ADR-0011 / exploration schema-first path).
 */

import {
	type FormModelsByCollection,
	type ProjectSchemaFormModelsOptions,
	projectSchemaFormModels,
} from "@cms/core/semantic";
import type { ZodType } from "zod";
import type { EditorCollections } from "../types";
import { type LowerFormModelOptions, lowerFormModelToSjsf } from "./lower-sjsf";
import { resolveCatalogBinding } from "./stock-registry";

/**
 * Lower each collection form model to JSON Schema + uiSchema for CmsForm.
 * Package-private — prefer {@link authoringPropsFromFormModels}.
 */
export function editorCollectionsFromFormModels(
	models: FormModelsByCollection,
	options?: LowerFormModelOptions,
): EditorCollections {
	const out: EditorCollections = {};
	for (const [id, model] of Object.entries(models)) {
		if (!model) continue;
		out[id] = lowerFormModelToSjsf(model, options);
	}
	return out;
}

export type EditorCollectionsFromSchemasOptions =
	ProjectSchemaFormModelsOptions;

/**
 * Package-private schema-first lowering: stamped Zod collection schemas
 * (+ optional form trees) → EditorCollections. Stock editors apply by
 * semantic kind; form-tree `.editor` keys resolve through the live catalog.
 *
 * Hosts mount via {@link authoringPropsFromDefineCms} instead. Client
 * validation uses the lowered Ajv JSON Schema; authoritative parse stays
 * on the host Zod / Standard Schema Input (dual engines OK).
 */
export function editorCollectionsFromSchemas(
	collections: Readonly<Record<string, ZodType>>,
	catalog: Readonly<Record<string, unknown>>,
	options?: EditorCollectionsFromSchemasOptions,
): EditorCollections {
	const formModels = projectSchemaFormModels(collections, options);
	return editorCollectionsFromFormModels(formModels, {
		resolveBinding: resolveCatalogBinding(catalog),
	});
}
