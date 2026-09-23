/**
 * Form-shell mount seams → EditorCollections.
 * Compile / schema projection, form-model walk, SJSF lowering, and catalog
 * binding stay implementation (ADR-0011 / 0019 / 0020).
 */

import {
	compileSemanticIr,
	type FormModelsByCollection,
	type ProjectSchemaFormModelsOptions,
	projectFormModels,
	projectSchemaFormModels,
	type SemanticConfigInput,
} from "@cms/core/semantic";
import type { ZodType } from "zod";
import type { EditorCollections } from "../types";
import { type LowerFormModelOptions, lowerFormModelToSjsf } from "./lower-sjsf";
import { resolveCatalogBinding } from "./stock-registry";

/**
 * Lower each collection form model to JSON Schema + uiSchema for CmsForm.
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

/**
 * Build shell `collections` from the CMS-first unified tree and the live
 * components catalog. Hosts must not assemble compile → project → lower.
 */
export function editorCollectionsFromTree(
	collections: SemanticConfigInput["collections"],
	catalog: Readonly<Record<string, unknown>>,
): EditorCollections {
	const ir = compileSemanticIr({ collections });
	const formModels = projectFormModels(ir);
	return editorCollectionsFromFormModels(formModels, {
		resolveBinding: resolveCatalogBinding(catalog),
	});
}

export type EditorCollectionsFromSchemasOptions =
	ProjectSchemaFormModelsOptions;

/**
 * Schema-first face: stamped Zod collection schemas (+ optional nested overlay)
 * → EditorCollections for the form shell. Stock editors apply by semantic kind;
 * overlay `editor` keys resolve through the live catalog like IR overrides.
 *
 * Client validation uses the lowered Ajv JSON Schema; authoritative parse stays
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
