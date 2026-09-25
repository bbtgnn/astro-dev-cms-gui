/**
 * Portable `defineCms` — schema + location + form → host descriptors.
 *
 * Distinct from `@cms/astro/config` {@link defineAstroCms}, which is options-only
 * (presentation: `form` / `previewUrl` / `type`) and does **not** take
 * `schema` or `location` (those come from Astro `content.config` + stamps).
 *
 * Location lives on {@link CmsHelpers.collection} so non-Astro hosts can build
 * {@link CollectionDescriptor}s for `createCmsHost` without a separate secret.
 */

import { z } from "zod";
import type { FormTree, ScopedFormTreeHelpers } from "../form-tree/form-tree";
import { createScopedFormTreeHelpers } from "../form-tree/form-tree";
import {
	type ContentFieldStampMeta,
	stampContentFieldLeaf,
} from "../semantic/content-field-stamp";
import type {
	CollectionConfig,
	CollectionDescriptor,
} from "../writer/collection-descriptors";

export type CmsImage = string & { readonly __cmsKind: "image" };

export type CmsFile = string & { readonly __cmsKind: "file" };

export type CmsReference<C extends string = string> = string & {
	readonly __cmsKind: "reference";
	readonly __cmsCollection: C;
};

export type CmsCollectionType = "collection" | "singleton";

/**
 * FS (or host) location for write-back — joined into {@link CollectionDescriptor}.
 * Not presentation chrome; not a host-only-only secret on this face.
 */
export type CollectionLocation = {
	readonly base: string;
	readonly pathTemplate?: string;
};

export type FormBuilderFor<Data> = (f: ScopedFormTreeHelpers<Data>) => FormTree;

export type CmsCollectionOptions<Schema extends z.ZodType> = {
	readonly schema: Schema;
	readonly location: CollectionLocation;
	readonly form?: FormTree | FormBuilderFor<z.input<Schema>>;
	readonly previewUrl?: (id: string) => string | null;
	readonly type?: CmsCollectionType;
};

export type CmsCollectionBuilt<Schema extends z.ZodType = z.ZodType> = {
	readonly schema: Schema;
	readonly location: CollectionLocation;
	readonly form?: FormTree;
	readonly previewUrl?: (id: string) => string | null;
	readonly type: CmsCollectionType;
};

function resolveForm<Data>(form: FormTree | FormBuilderFor<Data>): FormTree {
	if (typeof form === "function") {
		return form(createScopedFormTreeHelpers<Data>());
	}
	return form;
}

function toDescriptor(
	name: string,
	built: CmsCollectionBuilt,
): CollectionDescriptor {
	const config: CollectionConfig = {
		base: built.location.base,
		...(built.location.pathTemplate !== undefined
			? { pathTemplate: built.location.pathTemplate }
			: {}),
		...(built.type === "singleton" ? { kind: "singleton" as const } : {}),
	};
	return {
		name,
		schema: built.schema,
		base: built.location.base,
		config,
	};
}

export type CmsHelpers = {
	collection: <Schema extends z.ZodType>(
		opts: CmsCollectionOptions<Schema>,
	) => CmsCollectionBuilt<Schema>;
	image: () => z.ZodType<CmsImage, CmsImage>;
	file: () => z.ZodType<CmsFile, CmsFile>;
	reference: <C extends string>(
		collection: C,
	) => z.ZodType<CmsReference<C>, CmsReference<C>>;
};

export type DefineCmsResult<
	Collections extends Record<string, CmsCollectionBuilt> = Record<
		string,
		CmsCollectionBuilt
	>,
> = {
	readonly collections: {
		readonly [K in keyof Collections]: Collections[K] & {
			readonly name: K & string;
		};
	};
	readonly descriptors: CollectionDescriptor[];
	readonly schemas: {
		readonly [K in keyof Collections]: Collections[K]["schema"];
	};
	readonly forms: {
		readonly [K in keyof Collections]?: FormTree;
	};
	readonly types: {
		readonly [K in keyof Collections]: CmsCollectionType;
	};
	readonly getPreviewUrl: (collection: string, id: string) => string | null;
};

function createCmsHelpers(): CmsHelpers {
	return {
		collection<Schema extends z.ZodType>(
			opts: CmsCollectionOptions<Schema>,
		): CmsCollectionBuilt<Schema> {
			return {
				schema: opts.schema,
				location: opts.location,
				type: opts.type ?? "collection",
				...(opts.form !== undefined
					? { form: resolveForm<z.input<Schema>>(opts.form) }
					: {}),
				...(opts.previewUrl !== undefined
					? { previewUrl: opts.previewUrl }
					: {}),
			};
		},
		image(): z.ZodType<CmsImage, CmsImage> {
			const base = z.string() as unknown as z.ZodType<CmsImage, CmsImage> & {
				meta?: (m: unknown) => unknown;
			};
			const stamp: ContentFieldStampMeta = { kind: "image" };
			return stampContentFieldLeaf(base, stamp, { cms: stamp });
		},
		file(): z.ZodType<CmsFile, CmsFile> {
			const base = z.string() as unknown as z.ZodType<CmsFile, CmsFile> & {
				meta?: (m: unknown) => unknown;
			};
			const stamp: ContentFieldStampMeta = { kind: "file" };
			return stampContentFieldLeaf(base, stamp, { cms: stamp });
		},
		reference<C extends string>(
			collection: C,
		): z.ZodType<CmsReference<C>, CmsReference<C>> {
			const base = z.string() as unknown as z.ZodType<
				CmsReference<C>,
				CmsReference<C>
			> & {
				meta?: (m: unknown) => unknown;
			};
			const stamp: ContentFieldStampMeta = {
				kind: "reference",
				collection,
			};
			return stampContentFieldLeaf(base, stamp, { cms: stamp });
		},
	};
}

/**
 * Portable CMS config face for non-Astro hosts.
 *
 * @example
 * ```ts
 * const config = defineCms((cms) => ({
 *   authors: cms.collection({
 *     schema: z.object({ name: z.string() }),
 *     location: { base: "src/content/authors" },
 *     form: (f) => [f.field("name").label("Name")],
 *   }),
 * }));
 * createCmsHost({ root, config }); // or { root, collections, … }
 * ```
 */
export function defineCms<
	Collections extends Record<string, CmsCollectionBuilt>,
>(factory: (cms: CmsHelpers) => Collections): DefineCmsResult<Collections> {
	const built = factory(createCmsHelpers());
	const names = Object.keys(built) as (keyof Collections & string)[];

	const collections = {} as DefineCmsResult<Collections>["collections"];
	const schemas = {} as DefineCmsResult<Collections>["schemas"];
	const forms: Record<string, FormTree | undefined> = {};
	const types = {} as DefineCmsResult<Collections>["types"];
	const previewByCollection = new Map<string, (id: string) => string | null>();
	const descriptors: CollectionDescriptor[] = [];

	for (const name of names) {
		const entry = built[name];
		(collections as Record<string, unknown>)[name] = {
			...entry,
			name,
		};
		(schemas as Record<string, z.ZodType>)[name] = entry.schema;
		(types as Record<string, CmsCollectionType>)[name] = entry.type;
		if (entry.form !== undefined) {
			forms[name] = entry.form;
		}
		if (entry.previewUrl !== undefined) {
			previewByCollection.set(name, entry.previewUrl);
		}
		descriptors.push(toDescriptor(name, entry));
	}

	return {
		collections,
		descriptors,
		schemas,
		forms: forms as DefineCmsResult<Collections>["forms"],
		types,
		getPreviewUrl: (collection, id) =>
			previewByCollection.get(collection)?.(id) ?? null,
	};
}
