/**
 * Default draft-write eligibility from form-model JSON Schema (ADR-0014).
 * Lives in authoring so @cms/core stays free of SJSF/Ajv (ADR-0008 / 0018).
 * Session takes the opaque predicate — does not import this module.
 */

import { stripUiFromJsonSchema } from "@cms/core/semantic";
import { createFormValidator } from "@sjsf/ajv8-validator";
import type { Schema } from "@sjsf/form";

export type DraftEligibility = (data: Record<string, unknown>) => boolean;

/**
 * Build a structural draft-write gate from a form-model JSON Schema
 * (`projectFormModels` / `EditorCollectionInput.schema`).
 * Host authoritative Zod remains separate (async / env checks).
 */
export function createDraftEligibility(
	jsonSchema: Record<string, unknown>,
): DraftEligibility {
	const schema = stripUiFromJsonSchema(jsonSchema) as Schema;
	const validator = createFormValidator();
	return (data) => validator.isValid(schema, schema, data as never);
}
