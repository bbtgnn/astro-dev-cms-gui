/**
 * Emitter golden / substring assertions for representative IR (ADR-0019 slice 3).
 */

import { describe, expect, test } from "bun:test";
import { compileSemanticIr, s } from "@cms/core/semantic";
import {
	emitContentConfig,
	emitPersistedSchema,
} from "../src/generate/emit-content-config.ts";
import { HASH_MARKER } from "../src/generate/hash.ts";

describe("emitPersistedSchema", () => {
	test("maps scalars, constraints, wrappers, image, reference", () => {
		expect(
			emitPersistedSchema({
				kind: "string",
				constraints: [{ method: "min", value: 1 }],
			}),
		).toBe("z.string().min(1)");
		expect(
			emitPersistedSchema({
				kind: "string",
				constraints: [
					{ method: "max", value: 70 },
					{ method: "regex", source: "^[a-z]+$", flags: "i" },
				],
			}),
		).toBe(`z.string().max(70).regex(new RegExp("^[a-z]+$", "i"))`);
		expect(
			emitPersistedSchema({
				kind: "number",
				constraints: [
					{ method: "int" },
					{ method: "min", value: 0 },
					{ method: "max", value: 10 },
				],
			}),
		).toBe("z.number().int().min(0).max(10)");
		expect(emitPersistedSchema({ kind: "boolean" })).toBe("z.boolean()");
		expect(emitPersistedSchema({ kind: "literal", value: "posts" })).toBe(
			`z.literal("posts")`,
		);
		expect(emitPersistedSchema({ kind: "enum", values: ["a", "b"] })).toBe(
			`z.enum(["a", "b"])`,
		);
		expect(emitPersistedSchema({ kind: "image" })).toBe("image()");
		expect(
			emitPersistedSchema({ kind: "reference", collection: "authors" }),
		).toBe(`reference("authors")`);
		expect(
			emitPersistedSchema({
				kind: "optional",
				of: { kind: "image" },
			}),
		).toBe("image().optional()");
		expect(
			emitPersistedSchema({
				kind: "nullable",
				of: { kind: "string", constraints: [] },
			}),
		).toBe("z.string().nullable()");
		expect(
			emitPersistedSchema({
				kind: "default",
				of: { kind: "boolean" },
				value: false,
			}),
		).toBe("z.boolean().default(false)");
	});

	test("maps nested object, array, and discriminatedUnion with injected discriminant", () => {
		const object = emitPersistedSchema({
			kind: "object",
			fields: [
				{
					id: "title",
					schema: {
						kind: "string",
						constraints: [{ method: "max", value: 70 }],
					},
					semanticKind: "string",
				},
			],
		});
		expect(object).toContain("z.object({");
		expect(object).toContain("title: z.string().max(70)");

		expect(
			emitPersistedSchema({
				kind: "array",
				of: { kind: "string", constraints: [] },
			}),
		).toBe("z.array(z.string())");

		const union = emitPersistedSchema({
			kind: "discriminatedUnion",
			discriminant: "type",
			variants: [
				{
					id: "article",
					fields: [
						{
							id: "type",
							schema: { kind: "literal", value: "article" },
							semanticKind: "literal",
						},
						{
							id: "title",
							schema: { kind: "string", constraints: [] },
							semanticKind: "string",
						},
					],
				},
				{
					id: "link",
					fields: [
						{
							id: "type",
							schema: { kind: "literal", value: "link" },
							semanticKind: "literal",
						},
						{
							id: "url",
							schema: { kind: "string", constraints: [] },
							semanticKind: "string",
						},
					],
				},
			],
		});
		expect(union).toContain(`z.discriminatedUnion("type"`);
		expect(union).toContain(`type: z.literal("article")`);
		expect(union).toContain(`type: z.literal("link")`);
		expect(union).toContain("title: z.string()");
		expect(union).toContain("url: z.string()");
	});
});

describe("emitContentConfig", () => {
	test("emits native Astro source for representative IR (image, reference, optional, nested, glob)", () => {
		const ir = compileSemanticIr({
			collections: {
				posts: s.collection({
					loader: s.glob({
						base: "./src/content/posts",
						pattern: "**/*.json",
					}),
					schema: s.stack([
						s.field({ id: "title", schema: s.string().min(1) }),
						s.field({ id: "body", schema: s.string() }),
						s.field({ id: "cover", schema: s.image().optional() }),
						s.field({ id: "author", schema: s.reference("authors") }),
						s.object({
							id: "seo",
							content: [
								s.field({
									id: "title",
									schema: s.string().max(70),
								}),
								s.field({
									id: "description",
									schema: s.string().max(160),
								}),
							],
						}),
						s.discriminatedUnion({
							id: "block",
							discriminant: "type",
							variants: [
								s.object({
									id: "text",
									content: [s.field({ id: "body", schema: s.string() })],
								}),
								s.object({
									id: "quote",
									content: [s.field({ id: "cite", schema: s.string() })],
								}),
							],
						}),
					]),
				}),
				authors: s.collection({
					loader: s.glob({
						base: "./src/content/authors",
						pattern: "**/*.json",
					}),
					schema: s.field({ id: "name", schema: s.string().min(1) }),
				}),
			},
		});

		const source = emitContentConfig(ir, {
			sourceHash: "a".repeat(64),
		});

		expect(
			source.startsWith("// Generated by Astro Dev CMS. Do not edit."),
		).toBe(true);
		expect(source).toContain(`// ${HASH_MARKER} ${"a".repeat(64)}`);
		expect(source).toContain('from "astro:content"');
		expect(source).toContain('from "astro/loaders"');
		expect(source).toContain('from "astro/zod"');
		expect(source).toContain("defineCollection");
		expect(source).toContain("reference");
		expect(source).toContain("type SchemaContext");
		expect(source).toContain(
			"export const postsSchema = ({ image }: SchemaContext) =>",
		);
		expect(source).toContain("title: z.string().min(1)");
		expect(source).toContain("cover: image().optional()");
		expect(source).toContain('author: reference("authors")');
		expect(source).toContain("seo: z.object({");
		expect(source).toContain('z.discriminatedUnion("type"');
		expect(source).toContain('type: z.literal("text")');
		expect(source).toContain('type: z.literal("quote")');
		expect(source).toContain(
			`loader: glob({\n\t\tbase: "./src/content/posts",\n\t\tpattern: "**/*.json",\n\t})`,
		);
		expect(source).toContain("export const authorsSchema = z.object({");
		expect(source).toContain("name: z.string().min(1)");
		expect(source).toContain("export const collections = { authors, posts };");
		expect(source).not.toContain("ZodTypeAny");
		expect(source).not.toMatch(/\bas\s+/);
	});

	test("strips presentation — header/separator/tabs do not appear as fields", () => {
		const ir = compileSemanticIr({
			collections: {
				posts: s.collection({
					loader: s.glob({ base: "./c", pattern: "**/*.json" }),
					schema: s.tabs([
						s.tab({
							id: "main",
							label: "Main",
							content: [
								s.header({ label: "Ignore" }),
								s.separator(),
								s.field({ id: "title", schema: s.string() }),
							],
						}),
					]),
				}),
			},
		});

		const source = emitContentConfig(ir);
		expect(source).toContain("title: z.string()");
		expect(source).not.toContain("Ignore");
		expect(source).not.toContain("header");
		expect(source).not.toContain("separator");
	});

	test("fails closed on unexpected persisted kind", () => {
		expect(() =>
			emitPersistedSchema({
				kind: "not-a-real-kind",
			} as never),
		).toThrow(/Unexpected persisted IR/);
	});
});
