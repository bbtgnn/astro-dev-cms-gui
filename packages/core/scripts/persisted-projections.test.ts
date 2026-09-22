/**
 * Persisted-schema projections seam — parity across JSON Schema, Zod, Astro plan.
 */

import { describe, expect, test } from "bun:test";
import {
	compileSemanticIr,
	persistedProjections,
	s,
} from "../src/semantic";
import { projectAstroSchemaExpr } from "../src/semantic/persisted-projections.ts";

function sampleIr() {
	return compileSemanticIr({
		collections: {
			authors: s.collection({
				loader: s.glob({ base: "./src/content/authors", pattern: "**/*.json" }),
				schema: s.stack([
					s.field({ id: "name", label: "Name", schema: s.string().min(1) }),
				]),
			}),
			posts: s.collection({
				loader: s.glob({ base: "./src/content/posts", pattern: "**/*.json" }),
				schema: s.tabs([
					s.tab({
						id: "content",
						label: "Content",
						content: [
							s.field({
								id: "title",
								label: "Title",
								schema: s.string().min(1).max(70),
							}),
							s.field({ id: "draft", schema: s.boolean() }),
							s.object({
								id: "seo",
								label: "SEO",
								content: [
									s.field({
										id: "description",
										schema: s.string().max(160),
									}),
								],
							}),
						],
					}),
					s.tab({
						id: "media",
						label: "Media",
						content: [
							s.header({ label: "Assets" }),
							s.field({ id: "cover", schema: s.image().optional() }),
							s.field({
								id: "author",
								schema: s.reference("authors"),
							}),
						],
					}),
				]),
			}),
		},
	});
}

describe("persistedProjections", () => {
	test("json / zod / astro share collection keys", () => {
		const ir = sampleIr();
		const p = persistedProjections(ir);
		const jsonKeys = Object.keys(p.jsonSchemas()).sort();
		const zodKeys = Object.keys(p.zodSchemas()).sort();
		const plan = p.astroSchemaPlan();
		expect(jsonKeys).toEqual(["authors", "posts"]);
		expect(zodKeys).toEqual(jsonKeys);
		expect([...plan.collectionIds].sort()).toEqual(jsonKeys);
	});

	test("image / reference triad: string · string · tagged", () => {
		const ir = sampleIr();
		const p = persistedProjections(ir);
		const props = p.jsonSchemas().posts?.properties as Record<
			string,
			Record<string, unknown>
		>;
		expect(props?.cover).toEqual({ type: "string" });
		expect(props?.author).toEqual({ type: "string" });

		const plan = p.astroSchemaPlan();
		expect(plan.needsImage).toBe(true);
		expect(plan.needsReference).toBe(true);
		expect(plan.byCollection.posts?.needsImage).toBe(true);
		expect(plan.byCollection.posts?.root.tag).toBe("object");
		if (plan.byCollection.posts?.root.tag !== "object") {
			throw new Error("expected object root");
		}
		const cover = plan.byCollection.posts.root.fields.find(
			(f) => f.id === "cover",
		);
		expect(cover?.schema).toEqual({
			tag: "optional",
			of: { tag: "image" },
		});
		const author = plan.byCollection.posts.root.fields.find(
			(f) => f.id === "author",
		);
		expect(author?.schema).toEqual({
			tag: "reference",
			collection: "authors",
		});
	});

	test("presentation strip — no header keys in any projection", () => {
		const ir = sampleIr();
		const props = persistedProjections(ir).jsonSchemas().posts
			?.properties as Record<string, unknown>;
		expect(props?.Assets).toBeUndefined();
		expect(Object.keys(props ?? {}).sort()).toEqual([
			"author",
			"cover",
			"draft",
			"seo",
			"title",
		]);
	});

	test("projectAstroSchemaExpr matches plan leaf encodings", () => {
		expect(projectAstroSchemaExpr({ kind: "image" })).toEqual({
			tag: "image",
		});
		expect(
			projectAstroSchemaExpr({
				kind: "reference",
				collection: "authors",
			}),
		).toEqual({ tag: "reference", collection: "authors" });
		expect(
			projectAstroSchemaExpr({
				kind: "optional",
				of: { kind: "image" },
			}),
		).toEqual({ tag: "optional", of: { tag: "image" } });
	});

	test("fails closed on unexpected persisted kind", () => {
		expect(() =>
			projectAstroSchemaExpr({
				kind: "not-a-real-kind",
			} as never),
		).toThrow(/Unexpected persisted IR/);
	});
});
