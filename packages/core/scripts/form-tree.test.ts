/**
 * Form tree builders — runtime node shape (ticket 12).
 * Typing intent lives in form-tree.fixtures.ts (compile-time).
 */
import { describe, expect, test } from "bun:test";
import { createFormTreeHelpers } from "../src/form-tree";

type Data = {
	title: string;
	body: string;
	seo: { description: string; keywords: string };
	cover: string;
};

describe("createFormTreeHelpers", () => {
	test("field fluent chrome builds a field-ref node", () => {
		const { field } = createFormTreeHelpers<Data>();
		const node = field("title").label("Title").editor("Markdown").kind("image");

		expect(node).toMatchObject({
			type: "field",
			key: "title",
			chrome: {
				label: "Title",
				editor: "Markdown",
				kind: "image",
			},
		});
		expect(node.content).toBeUndefined();
	});

	test("tabs takes object entries, not tab() helpers", () => {
		const { field, tabs } = createFormTreeHelpers<Data>();
		const node = tabs([
			{
				id: "main",
				label: "Main",
				content: [field("title").label("Title")],
			},
			{
				id: "body",
				content: [field("body")],
			},
		]);

		expect(node.type).toBe("tabs");
		expect(node.content).toHaveLength(2);
		expect(node.content[0]).toMatchObject({
			id: "main",
			label: "Main",
		});
		expect(node.content[0]?.content[0]).toMatchObject({
			type: "field",
			key: "title",
			chrome: { label: "Title" },
		});
		expect(node.content[1]).toMatchObject({ id: "body" });
		expect("label" in (node.content[1] ?? {})).toBe(false);
	});

	test("columns takes arrays of children — no column() wrapper", () => {
		const { field, columns } = createFormTreeHelpers<Data>();
		const node = columns([[field("title")], [field("body").label("Body")]]);

		expect(node.type).toBe("columns");
		expect(node.content).toHaveLength(2);
		expect(node.content[0]).toHaveLength(1);
		expect(node.content[0]?.[0]).toMatchObject({ type: "field", key: "title" });
		expect(node.content[1]?.[0]).toMatchObject({
			type: "field",
			key: "body",
			chrome: { label: "Body" },
		});
	});

	test("group wraps sibling content with optional label", () => {
		const { field, group } = createFormTreeHelpers<Data>();
		const node = group({
			label: "Meta",
			content: [field("title"), field("body")],
		});

		expect(node).toMatchObject({
			type: "group",
			label: "Meta",
		});
		expect(node.content).toHaveLength(2);
		expect(node.content[0]).toMatchObject({ type: "field", key: "title" });
	});

	test("object .fields rebinds nested keys onto field content", () => {
		const { field } = createFormTreeHelpers<Data>();
		const node = field("seo")
			.label("SEO")
			.fields((f) => [
				f("description").label("Desc"),
				f("keywords").editor("Tags"),
			]);

		expect(node).toMatchObject({
			type: "field",
			key: "seo",
			chrome: { label: "SEO" },
		});
		expect(node.content).toHaveLength(2);
		expect(node.content?.[0]).toMatchObject({
			type: "field",
			key: "description",
			chrome: { label: "Desc" },
		});
		expect(node.content?.[1]).toMatchObject({
			type: "field",
			key: "keywords",
			chrome: { editor: "Tags" },
		});
	});

	test("object .form rebinds nested helpers including layout", () => {
		const { field } = createFormTreeHelpers<Data>();
		const node = field("seo").form((f) =>
			f.tabs([
				{
					id: "meta",
					label: "Meta",
					content: [f("description").label("Desc")],
				},
			]),
		);

		expect(node.type).toBe("field");
		expect(node.key).toBe("seo");
		expect(node.content).toHaveLength(1);
		expect(node.content?.[0]).toMatchObject({
			type: "tabs",
		});
		const tabsNode = node.content?.[0];
		expect(
			tabsNode && tabsNode.type === "tabs" && tabsNode.content[0],
		).toMatchObject({
			id: "meta",
			label: "Meta",
		});
	});

	test("layout containers keep the same key space (root field inside tabs/columns/group)", () => {
		const { field, tabs, columns, group } = createFormTreeHelpers<Data>();
		const tree = [
			tabs([
				{
					id: "main",
					content: [
						field("title"),
						columns([
							[field("body")],
							[group({ content: [field("cover").kind("image")] })],
						]),
					],
				},
			]),
		];

		const tabsNode = tree[0];
		expect(tabsNode?.type).toBe("tabs");
		const mainContent =
			tabsNode?.type === "tabs" ? tabsNode.content[0]?.content : [];
		expect(mainContent?.[0]).toMatchObject({ type: "field", key: "title" });
		expect(mainContent?.[1]).toMatchObject({ type: "columns" });
		const cols = mainContent?.[1];
		expect(cols && cols.type === "columns" && cols.content[1]?.[0]).toMatchObject(
			{
				type: "group",
			},
		);
		expect(
			cols &&
				cols.type === "columns" &&
				cols.content[1]?.[0]?.type === "group" &&
				cols.content[1][0].content[0],
		).toMatchObject({
			type: "field",
			key: "cover",
			chrome: { kind: "image" },
		});
	});

	test("field ref is presentation only — not an IR s.field schema node", () => {
		const { field } = createFormTreeHelpers<Data>();
		const node = field("title");
		expect(node).not.toHaveProperty("schema");
		expect(node).not.toHaveProperty("semanticKind");
		expect(Object.hasOwn(node, "type")).toBe(true);
		expect(node.type).toBe("field");
	});
});
