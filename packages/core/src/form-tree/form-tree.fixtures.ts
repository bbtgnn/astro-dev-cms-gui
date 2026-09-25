/**
 * Compile-time fixtures for form-tree builders (ticket 12).
 * Expect: `bunx tsc -p ./scripts/tsconfig.fixtures.json` exits 0.
 * Negatives use @ts-expect-error.
 */

import {
	createFormTreeHelpers,
	type FieldRefBuilder,
	type FormTree,
	type FormTreeHelpers,
	type FormTreeNode,
} from "./form-tree";

type Data = {
	title: string;
	body: string;
	seo: { description: string; keywords: string };
	cover: string;
};

const cms: FormTreeHelpers<Data> = createFormTreeHelpers<Data>();

// Root keys are keyof Data
const titleRef: FieldRefBuilder<Data, "title"> = cms
	.field("title")
	.label("Title")
	.editor("Markdown");

void titleRef;

// @ts-expect-error "missing" is not a key of Data
cms.field("missing");

// Layout does not change key space — same field helper inside tabs/columns/group
const layoutTree: FormTree = [
	cms.tabs([
		{
			id: "main",
			label: "Main",
			content: [
				cms.field("title"),
				cms.columns([
					[cms.field("body")],
					[
						cms.group({
							label: "Media",
							content: [cms.field("cover").kind("image")],
						}),
					],
				]),
			],
		},
	]),
];

void layoutTree;

// Object enter rebinds f to keyof seo
const seoFields: FormTreeNode = cms.field("seo").fields((f) => [
	f("description").label("Desc"),
	f("keywords"),
	// @ts-expect-error "title" is not a key of seo
	f("title"),
]);

void seoFields;

const seoForm: FormTreeNode = cms.field("seo").form((f) =>
	f.tabs([
		{
			id: "meta",
			content: [
				f("description"),
				// @ts-expect-error "body" is not a key of seo
				f("body"),
			],
		},
	]),
);

void seoForm;

// Scalar field refs do not expose object enter
const scalar = cms.field("title");
// @ts-expect-error title is string — no .fields callback scope
scalar.fields;
// @ts-expect-error title is string — no .form callback scope
scalar.form;

// Tab entries are objects — there is no tab() helper on the factory
const helpers = createFormTreeHelpers<Data>();
// @ts-expect-error no singular tab() on form-tree helpers
helpers.tab;
// @ts-expect-error no singular column() on form-tree helpers
helpers.column;
