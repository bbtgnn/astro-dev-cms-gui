/**
 * Type-resolution probe for @sjsf/* conditional exports (svelte condition).
 * Kept so `tsc -p packages/form` fails if IDE/build resolution regresses.
 */
import { createFormValidator } from "@sjsf/ajv8-validator";
import { theme } from "@sjsf/basic-theme";
import { BasicForm, createForm } from "@sjsf/form";
import { createFormIdBuilder } from "@sjsf/form/id-builders/modern";
import { createFormMerger } from "@sjsf/form/mergers/modern";
import { resolver } from "@sjsf/form/resolvers/basic";
import { translation } from "@sjsf/form/translations/en";

export const sjsfImports = {
	BasicForm,
	createForm,
	createFormIdBuilder,
	createFormMerger,
	createFormValidator,
	resolver,
	theme,
	translation,
} as const;
