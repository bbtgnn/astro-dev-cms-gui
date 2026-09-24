/**
 * Schema-first persisted-Input rewrite: stamped Zod → authoritative Input Zod.
 *
 * Peer of {@link projectSchemaFormModel} (ADR-0024 / ADR-0010): image/ref leaves
 * become path/id strings (+ optional host existence checks). Other structure stays
 * on the live schema. Dual walk engines stay separate — do not merge with form
 * projection.
 */

import { z } from "zod";
import { unwrapZod } from "./content-field-stamp";
import { zodArrayElement, zodObjectShape } from "./zod-walk";

export type InputValidatorDeps = {
	isAcceptedImageAsset?: (path: string) => boolean | Promise<boolean>;
	entryExists?: (collection: string, id: string) => boolean | Promise<boolean>;
};

/**
 * Rewrite stamped image/ref leaves to persisted Input strings (+ host checks).
 * Other structure stays on the live schema. Ensures protocol values are paths/ids
 * even when Astro’s Zod looks like metadata Output.
 */
export function toPersistedInputSchema(
	schema: z.ZodType,
	deps: InputValidatorDeps | undefined,
	fieldPath: string,
): z.ZodType {
	const { inner, optional, nullable, defaultValue, stamp } = unwrapZod(schema);

	let result: z.ZodType;
	if (stamp?.kind === "image") {
		result = z.string();
		if (deps?.isAcceptedImageAsset) {
			const check = deps.isAcceptedImageAsset;
			result = z.string().refine(async (value) => check(value), {
				message: `Image path not accepted at ${fieldPath}`,
			});
		}
	} else if (stamp?.kind === "reference") {
		const target = stamp.collection;
		result = z.string();
		if (deps?.entryExists) {
			const exists = deps.entryExists;
			result = z.string().refine(async (id) => exists(target, id), {
				message: `Reference "${fieldPath}" target not found in collection "${target}"`,
			});
		}
	} else {
		const shape = zodObjectShape(inner);
		if (shape) {
			const next: Record<string, z.ZodType> = {};
			for (const [key, child] of Object.entries(shape)) {
				next[key] = toPersistedInputSchema(
					child as z.ZodType,
					deps,
					fieldPath === "" ? key : `${fieldPath}.${key}`,
				);
			}
			result = z.object(next);
		} else {
			const el = zodArrayElement(inner);
			if (el !== undefined) {
				result = z.array(
					toPersistedInputSchema(el as z.ZodType, deps, `${fieldPath}[]`),
				);
			} else {
				result = inner as z.ZodType;
			}
		}
	}

	if (nullable) result = result.nullable();
	if (optional) result = result.optional();
	if (defaultValue !== undefined) result = result.default(defaultValue);
	return result;
}
