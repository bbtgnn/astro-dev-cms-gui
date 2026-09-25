/**
 * Assemble {@link AuthoringApp} props — form models are the browser face
 * (ADR-0008 serializable seam). Portable defineCms sugar projects schemas
 * into that face; Astro SSR materializes form models then calls the same helper.
 */

import type { DefineCmsResult } from "@cms/core/define-cms";
import { createFetchClient } from "@cms/core/fetch-client";
import type { FormTree } from "@cms/core/form-tree";
import type { FormModelsByCollection } from "@cms/core/semantic";
import { projectSchemaFormModels } from "@cms/core/semantic";
import { editorCollectionsFromFormModels } from "../form/editor-collections";
import { resolveCatalogBinding } from "../form/stock-registry";
import type {
	AuthoringClient,
	EditorCollections,
	GetPreviewUrl,
} from "../types";

export type AuthoringPropsOptions = {
	/** Injected protocol client (tests / custom transport). Default: fetch client. */
	readonly client?: AuthoringClient;
	/** Mount base when creating the default fetch client. */
	readonly apiBase?: string;
	readonly getPreviewUrl?: GetPreviewUrl;
};

/** Alias kept for Kit / older call sites. */
export type AuthoringPropsFromDefineCmsOptions = AuthoringPropsOptions;

/** Props shape accepted by {@link AuthoringApp}. */
export type AuthoringAppProps = {
	readonly client: AuthoringClient;
	readonly collections: EditorCollections;
	readonly getPreviewUrl: GetPreviewUrl;
};

/**
 * Deep browser assemble: form models + catalog → AuthoringApp props.
 */
export function authoringPropsFromFormModels(
	formModels: FormModelsByCollection,
	catalog: Readonly<Record<string, unknown>>,
	options?: AuthoringPropsOptions,
): AuthoringAppProps {
	const collections = editorCollectionsFromFormModels(formModels, {
		resolveBinding: resolveCatalogBinding(catalog),
	});

	const client: AuthoringClient =
		options?.client ?? createFetchClient(options?.apiBase);

	return {
		client,
		collections,
		getPreviewUrl: options?.getPreviewUrl ?? (() => null),
	};
}

/**
 * Portable defineCms sugar: project schemas (+ form trees) → form models →
 * {@link authoringPropsFromFormModels}.
 */
export function authoringPropsFromDefineCms(
	config: Pick<DefineCmsResult, "schemas" | "forms" | "getPreviewUrl">,
	catalog: Readonly<Record<string, unknown>>,
	options?: AuthoringPropsOptions,
): AuthoringAppProps {
	const forms = Object.fromEntries(
		Object.entries(config.forms).filter(
			(entry): entry is [string, FormTree] => entry[1] != null,
		),
	);

	const formModels = projectSchemaFormModels(config.schemas, { forms });
	return authoringPropsFromFormModels(formModels, catalog, {
		...options,
		getPreviewUrl: options?.getPreviewUrl ?? config.getPreviewUrl,
	});
}
