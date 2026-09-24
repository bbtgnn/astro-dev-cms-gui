/**
 * Assemble {@link AuthoringApp} props from portable {@link defineCms} + catalog.
 *
 * Non-Astro hosts (e.g. SvelteKit): one call → client, collections, getPreviewUrl.
 * Astro product path still uses stamped form models + {@link CmsMount} — different
 * input face (schemas from content.config, not defineCms).
 */
import type { DefineCmsResult } from "@cms/core/define-cms";
import { createFetchClient } from "@cms/core/fetch-client";
import type { FormTree } from "@cms/core/form-tree";
import { editorCollectionsFromSchemas } from "./form/editor-collections";
import type {
	AuthoringClient,
	EditorCollections,
	GetPreviewUrl,
} from "./types";

export type AuthoringPropsFromDefineCmsOptions = {
	/** Injected protocol client (tests / custom transport). Default: fetch client. */
	readonly client?: AuthoringClient;
	/** Mount base when creating the default fetch client. */
	readonly apiBase?: string;
};

/** Props shape accepted by {@link AuthoringApp}. */
export type AuthoringAppProps = {
	readonly client: AuthoringClient;
	readonly collections: EditorCollections;
	readonly getPreviewUrl: GetPreviewUrl;
};

/**
 * Lower defineCms schemas + form trees through the catalog into AuthoringApp props.
 */
export function authoringPropsFromDefineCms(
	config: Pick<DefineCmsResult, "schemas" | "forms" | "getPreviewUrl">,
	catalog: Readonly<Record<string, unknown>>,
	options?: AuthoringPropsFromDefineCmsOptions,
): AuthoringAppProps {
	const forms = Object.fromEntries(
		Object.entries(config.forms).filter(
			(entry): entry is [string, FormTree] => entry[1] != null,
		),
	);

	const collections = editorCollectionsFromSchemas(config.schemas, catalog, {
		forms,
	});

	const client: AuthoringClient =
		options?.client ?? createFetchClient(options?.apiBase);

	return {
		client,
		collections,
		getPreviewUrl: config.getPreviewUrl,
	};
}
