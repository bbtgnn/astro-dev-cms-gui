/**
 * Default draft-write eligibility from Ajv-safe editor schema (ADR-0014).
 * Package-private — @cms/core stays free of SJSF/Ajv (ADR-0008 / 0018).
 * {@link openAuthoringSession} wires this; session takes the opaque predicate.
 *
 * Input must already be Ajv-safe (`EditorCollectionInput.schema` after
 * form-model lowering inside {@link authoringPropsFromFormModels}).
 */

import { createFormValidator } from "@sjsf/ajv8-validator";
import type { Schema } from "@sjsf/form";

export type DraftEligibility = (data: Record<string, unknown>) => boolean;

export function createDraftEligibility(
	jsonSchema: Record<string, unknown>,
): DraftEligibility {
	const schema = jsonSchema as Schema;
	const validator = createFormValidator();
	return (data) => validator.isValid(schema, schema, data as never);
}
