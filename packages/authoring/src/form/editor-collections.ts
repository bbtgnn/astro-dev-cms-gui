/**
 * Form-shell mount seam: unified tree + live catalog → EditorCollections.
 * Compile, form-model projection, SJSF lowering, and catalog binding stay
 * implementation (ADR-0011 / 0019 / 0020).
 */

import {
	compileSemanticIr,
	projectFormModels,
	type FormModelsByCollection,
	type SemanticConfigInput,
} from "@cms/core/semantic";
import type { EditorCollections } from "../types";
import { type LowerFormModelOptions, lowerFormModelToSjsf } from "./lower-sjsf";
import { resolveCatalogBinding } from "./stock-registry";

/**
 * Lower each collection form model to JSON Schema + uiSchema for CmsForm.
 * Package-private — callers use {@link editorCollectionsFromTree}.
 */
function editorCollectionsFromFormModels(
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
