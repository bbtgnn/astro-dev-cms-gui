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
	readonly client?: AuthoringClient;
	readonly apiBase?: string;
	readonly getPreviewUrl?: GetPreviewUrl;
};

export type AuthoringPropsFromDefineCmsOptions = AuthoringPropsOptions;

export type AuthoringAppProps = {
	readonly client: AuthoringClient;
	readonly collections: EditorCollections;
	readonly getPreviewUrl: GetPreviewUrl;
};

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
