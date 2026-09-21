/**
 * Compile-time fixtures: chained `.editor()` / `.wrapper()` catalog keys
 * (ADR-0019 residual 4.1).
 *
 * Run: bunx tsc -p packages/authoring/scripts/tsconfig.fixtures.json
 * Expect: exit 0. Negatives use @ts-expect-error.
 */

import type { Component } from "svelte";
import {
	type EditorExtraProps,
	type FieldEditorProps,
	createCmsBuilders,
	type InputOfNode,
} from "../src/config";

type SeoShape = { title: string; description: string };

const SeoEditor = ((_: unknown, __: unknown) => ({})) as Component<
	FieldEditorProps<SeoShape, "object">
>;

const WrongEditor = ((_: unknown, __: unknown) => ({})) as Component<
	FieldEditorProps<{ title: string; other: number }, "object">
>;

const StringEditor = ((_: unknown, __: unknown) => ({})) as Component<
	FieldEditorProps<string, "string">
>;

const ExtraPropsEditor = ((_: unknown, __: unknown) => ({})) as Component<
	FieldEditorProps<SeoShape, "object"> & { toolbar: string[] }
>;

const MarkdownEditor = ((_: unknown, __: unknown) => ({})) as Component<
	FieldEditorProps<string, "string"> & { toolbar: string[] }
>;

const catalog = {
	SeoEditor,
	WrongEditor,
	StringEditor,
	ExtraPropsEditor,
	MarkdownEditor,
} as const;

type Components = typeof catalog;

const s = createCmsBuilders<string, Components>();

// --- Happy path: tuple content → { title; description } ---

const seo = s
	.object({
		id: "seo",
		content: [
			s.field({ id: "title", schema: s.string() }),
			s.field({ id: "description", schema: s.string() }),
		],
	})
	.editor("SeoEditor");

type SeoFromNode = InputOfNode<typeof seo>;
const _seoCheck: SeoShape = null as unknown as SeoFromNode;
void _seoCheck;
void seo;

// --- Presentation chrome stripped from shape ---

const withChrome = s
	.object({
		id: "block",
		content: [
			s.header({ label: "SEO" }),
			s.field({ id: "title", schema: s.string() }),
			s.separator(),
			s.field({ id: "description", schema: s.string() }),
		],
	})
	.editor("SeoEditor");

type ChromeInferred = InputOfNode<typeof withChrome>;
const _chromeCheck: SeoShape = null as unknown as ChromeInferred;
void _chromeCheck;

// --- Nested object ---

const nested = s.object({
	id: "page",
	content: [
		s.field({ id: "title", schema: s.string() }),
		s.object({
			id: "seo",
			content: [
				s.field({ id: "title", schema: s.string() }),
				s.field({ id: "description", schema: s.string() }),
			],
		}),
	],
});

type NestedInferred = InputOfNode<typeof nested>;
type NestedExpected = {
	title: string;
	seo: { title: string; description: string };
};
const _nestedCheck: NestedExpected = null as unknown as NestedInferred;
void _nestedCheck;

// --- Mixed chrome: stack of durables (one-level flatten) ---

const mixed = s
	.object({
		id: "root",
		content: [
			s.stack([
				s.field({ id: "title", schema: s.string() }),
				s.field({ id: "description", schema: s.string() }),
			]),
		],
	})
	.editor("SeoEditor");

type MixedInferred = InputOfNode<typeof mixed>;
const _mixedCheck: SeoShape = null as unknown as MixedInferred;
void _mixedCheck;

// --- Field override + props as second arg ---

s.field({
	id: "body",
	schema: s.string(),
}).editor("MarkdownEditor", { toolbar: ["bold", "link"] });

// --- Aggregate extra props ---

s.object({
	id: "seo-extra",
	content: [
		s.field({ id: "title", schema: s.string() }),
		s.field({ id: "description", schema: s.string() }),
	],
}).editor("ExtraPropsEditor", { toolbar: ["bold"] });

// Props bag checked against ComponentProps minus shell keys
const _goodExtra: EditorExtraProps<(typeof catalog)["ExtraPropsEditor"]> = {
	toolbar: ["bold"],
};
void _goodExtra;
const _badExtra: EditorExtraProps<(typeof catalog)["ExtraPropsEditor"]> = {
	// @ts-expect-error toolbar must be string[]
	toolbar: 1,
};
void _badExtra;

// --- Negatives ---

s.object({
	id: "seo-bad-shape",
	content: [
		s.field({ id: "title", schema: s.string() }),
		s.field({ id: "description", schema: s.string() }),
	],
}).editor(
	// @ts-expect-error WrongEditor expects `other: number`, not `description: string`
	"WrongEditor",
);

s.object({
	id: "seo-bad-kind",
	content: [
		s.field({ id: "title", schema: s.string() }),
		s.field({ id: "description", schema: s.string() }),
	],
}).editor(
	// @ts-expect-error StringEditor is FieldEditorProps<string>, not object shape
	"StringEditor",
);

s.field({
	id: "body-bad",
	schema: s.string(),
}).editor(
	// @ts-expect-error object editor on string field
	"SeoEditor",
);

// Unknown catalog key
s.field({
	id: "body-unknown",
	schema: s.string(),
}).editor(
	// @ts-expect-error key not in Components catalog
	"MissingEditor",
);
// Optionality on schema node: Input becomes string | undefined
const optionalCover = s.field({
	id: "cover",
	schema: s.image().optional(),
});
type CoverInput = InputOfNode<typeof optionalCover>;
const _coverCheck: string | undefined = null as unknown as CoverInput;
void _coverCheck;

export {};
