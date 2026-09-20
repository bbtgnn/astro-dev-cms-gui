/**
 * Build shell `collections` map from IR form models (ADR-0019 slice 6).
 */

import type {
	FormModelsByCollection,
} from "@cms/core/semantic";
import type { EditorCollections } from "../types";
import {
	type LowerFormModelOptions,
	lowerFormModelToSjsf,
} from "./lower-sjsf";

/**
 * Lower each collection form model to JSON Schema + uiSchema for CmsForm.
 * Live `component` bindings stay module values when resolveBinding is identity.
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
