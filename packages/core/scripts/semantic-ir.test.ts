/**
 * Semantic IR compile seam (ADR-0019 slice 1).
 * Behavior is exercised through `compileSemanticIr` / `s`;
 * persisted partition via internal `persistedShape`.
 */

import { describe, expect, test } from "bun:test";
import {
	compileSemanticIr,
	SEMANTIC_NODE,
	SemanticIrError,
	s,
} from "../src/semantic";
import { persistedShape } from "../src/semantic/compile.ts";

function brand<T extends object>(
	node: T,
): T & { [typeof SEMANTIC_NODE]: true } {
	return Object.assign(node, { [SEMANTIC_NODE]: true as const });
}

describe("compileSemanticIr", () => {
	test("compiles a happy tree with tabs, fields, nested object, and glob loader", () => {
		const ir = compileSemanticIr({
			collections: {
				posts: s.collection({
					loader: s.glob({
						base: "./src/content/posts",
						pattern: "**/*.json",
					}),
					schema: s.tabs([
						s.tab({
							id: "content",
							label: "Content",
							icon: "ContentIcon",
							content: [
								s.field({
									id: "title",
									label: "Title",
									schema: s.string().min(1).max(70),
								}),
								s
									.field({
										id: "body",
										label: "Body",
										schema: s.string(),
									})
									.editor("MarkdownEditor", { toolbar: ["bold", "link"] }),
								s
									.object({
										id: "seo",
										label: "SEO",
										content: [
											s.field({
												id: "title",
												label: "SEO title",
												schema: s.string().max(70),
											}),
											s.field({
												id: "description",
												schema: s.string().max(160),
											}),
										],
									})
									.wrapper("SeoCard"),
							],
						}),
						s.tab({
							id: "publishing",
							label: "Publishing",
							content: [
								s
									.field({
										id: "author",
										schema: s.reference("authors"),
									})
									.editor("AuthorPicker"),
								s.field({
									id: "cover",
									schema: s.image().optional(),
								}),
								s.header({ label: "Meta" }),
								s.separator(),
							],
						}),
					]),
				}),
			},
		});

		expect(ir.collections.posts?.loader).toEqual({
			kind: "glob",
			base: "./src/content/posts",
			pattern: "**/*.json",
		});
		expect(ir.collections.posts?.schema.kind).toBe("tabs");

		const titleField = persistedShape(ir).posts?.fields.find(
			(f) => f.id === "title",
		);
		expect(titleField?.semanticKind).toBe("string");
		expect(titleField?.schema).toEqual({
			kind: "string",
			constraints: [
				{ method: "min", value: 1 },
				{ method: "max", value: 70 },
			],
		});

		const bodyField = persistedShape(ir).posts?.fields.find(
			(f) => f.id === "body",
		);
		expect(bodyField?.semanticKind).toBe("string");

		const seo = persistedShape(ir).posts?.fields.find((f) => f.id === "seo");
		expect(seo?.semanticKind).toBe("object");
		expect(seo?.schema.kind).toBe("object");
		if (seo?.schema.kind === "object") {
			expect(seo.schema.fields.map((f) => f.id)).toEqual([
				"title",
				"description",
			]);
		}

		expect(persistedShape(ir).posts?.fields.length).toBeGreaterThan(0);
	});

	test("strips presentation nodes from persisted shape", () => {
		const ir = compileSemanticIr({
			collections: {
				posts: s.collection({
					loader: s.glob({ base: "./c", pattern: "**/*.json" }),
					schema: s.stack([
						s.header({ label: "Ignore me" }),
						s.separator(),
						s.group({
							label: "Grouped",
							content: [
								s.columns([
									s.column({
										id: "main",
										width: 2,
										content: [s.field({ id: "title", schema: s.string() })],
									}),
									s.column({
										id: "side",
										content: [s.field({ id: "draft", schema: s.boolean() })],
									}),
								]),
							],
						}),
					]),
				}),
			},
		});

		expect(persistedShape(ir).posts?.fields.map((f) => f.id)).toEqual([
			"title",
			"draft",
		]);
		const kinds = JSON.stringify(persistedShape(ir));
		expect(kinds).not.toContain('"header"');
		expect(kinds).not.toContain('"separator"');
		expect(kinds).not.toContain('"tabs"');
		expect(kinds).not.toContain('"stack"');
		expect(kinds).not.toContain('"columns"');
		expect(kinds).not.toContain('"group"');
	});

	test("injects discriminant literal fields on union variants", () => {
		const ir = compileSemanticIr({
			collections: {
				posts: s.collection({
					loader: s.glob({ base: "./c", pattern: "**/*.json" }),
					schema: s.stack([
						s.discriminatedUnion({
							id: "hero",
							discriminant: "type",
							variants: [
								s.object({
									id: "image",
									content: [s.field({ id: "src", schema: s.image() })],
								}),
								s.object({
									id: "video",
									content: [s.field({ id: "url", schema: s.string() })],
								}),
							],
						}),
					]),
				}),
			},
		});

		const hero = persistedShape(ir).posts?.fields.find((f) => f.id === "hero");
		expect(hero?.schema.kind).toBe("discriminatedUnion");
		if (hero?.schema.kind !== "discriminatedUnion") {
			throw new Error("expected discriminatedUnion");
		}
		expect(hero.schema.discriminant).toBe("type");
		const imageVariant = hero.schema.variants.find((v) => v.id === "image");
		expect(imageVariant?.fields.map((f) => f.id)).toEqual(["type", "src"]);
		expect(imageVariant?.fields[0]?.schema).toEqual({
			kind: "literal",
			value: "image",
		});
		expect(imageVariant?.fields[0]?.semanticKind).toBe("literal");

		const videoVariant = hero.schema.variants.find((v) => v.id === "video");
		expect(videoVariant?.fields.map((f) => f.id)).toEqual(["type", "url"]);
		expect(videoVariant?.fields[0]?.schema).toEqual({
			kind: "literal",
			value: "video",
		});
	});

	test("rejects duplicate path-local ids", () => {
		expect(() =>
			compileSemanticIr({
				collections: {
					posts: s.collection({
						loader: s.glob({ base: "./c", pattern: "**/*.json" }),
						schema: s.stack([
							s.field({ id: "title", schema: s.string() }),
							s.field({ id: "title", schema: s.string() }),
						]),
					}),
				},
			}),
		).toThrow(SemanticIrError);

		try {
			compileSemanticIr({
				collections: {
					posts: s.collection({
						loader: s.glob({ base: "./c", pattern: "**/*.json" }),
						schema: s.stack([
							s.field({ id: "title", schema: s.string() }),
							s.field({ id: "title", schema: s.string() }),
						]),
					}),
				},
			});
		} catch (e) {
			expect(e).toBeInstanceOf(SemanticIrError);
			const err = e as SemanticIrError;
			expect(err.issues.some((i) => i.code === "duplicate_path")).toBe(true);
		}
	});

	test("allows the same id under different object paths", () => {
		const ir = compileSemanticIr({
			collections: {
				posts: s.collection({
					loader: s.glob({ base: "./c", pattern: "**/*.json" }),
					schema: s.stack([
						s.field({ id: "title", schema: s.string() }),
						s.object({
							id: "seo",
							content: [s.field({ id: "title", schema: s.string() })],
						}),
					]),
				}),
			},
		});
		expect(persistedShape(ir).posts?.fields.map((f) => f.id)).toEqual([
			"title",
			"seo",
		]);
	});

	test("rejects component and wrapper together", () => {
		try {
			const conflicted = Object.assign(
				s.object({
					id: "seo",
					content: [s.field({ id: "title", schema: s.string() })],
				}),
				{ component: "SeoEditor", wrapper: "SeoCard" },
			);
			compileSemanticIr({
				collections: {
					posts: s.collection({
						loader: s.glob({ base: "./c", pattern: "**/*.json" }),
						schema: conflicted,
					}),
				},
			});
			expect.unreachable("should have thrown");
		} catch (e) {
			expect(e).toBeInstanceOf(SemanticIrError);
			const err = e as SemanticIrError;
			expect(
				err.issues.some((i) => i.code === "component_wrapper_conflict"),
			).toBe(true);
		}
	});

	test("fails closed on unknown nodes", () => {
		const forged = brand({
			type: "zodEscape",
			schema: {},
		});
		try {
			compileSemanticIr({
				collections: {
					posts: s.collection({
						loader: s.glob({ base: "./c", pattern: "**/*.json" }),
						schema: s.stack([
							forged as unknown as ReturnType<typeof s.separator>,
						]),
					}),
				},
			});
			expect.unreachable("should have thrown");
		} catch (e) {
			expect(e).toBeInstanceOf(SemanticIrError);
			const err = e as SemanticIrError;
			expect(err.issues.some((i) => i.code === "unknown_node")).toBe(true);
		}
	});

	test("fails closed on unknown constraint methods", () => {
		const forgedSchema = brand({
			type: "string" as const,
			constraints: [{ method: "email" as const, value: true }],
		});
		try {
			compileSemanticIr({
				collections: {
					posts: s.collection({
						loader: s.glob({ base: "./c", pattern: "**/*.json" }),
						schema: s.field({
							id: "email",
							schema: forgedSchema as unknown as ReturnType<typeof s.string>,
						}),
					}),
				},
			});
			expect.unreachable("should have thrown");
		} catch (e) {
			expect(e).toBeInstanceOf(SemanticIrError);
			const err = e as SemanticIrError;
			expect(err.issues.some((i) => i.code === "unknown_constraint")).toBe(
				true,
			);
		}
	});

	test("rejects non-glob loaders", () => {
		const badLoader = brand({
			type: "file",
			base: "./c",
		});
		try {
			compileSemanticIr({
				collections: {
					posts: brand({
						type: "collection" as const,
						loader: badLoader,
						schema: s.field({ id: "title", schema: s.string() }),
					}) as unknown as ReturnType<typeof s.collection>,
				},
			});
			expect.unreachable("should have thrown");
		} catch (e) {
			expect(e).toBeInstanceOf(SemanticIrError);
			const err = e as SemanticIrError;
			expect(err.issues.some((i) => i.code === "unsupported_loader")).toBe(
				true,
			);
		}
	});

	test("round-trips constraint methods onto IR", () => {
		const ir = compileSemanticIr({
			collections: {
				posts: s.collection({
					loader: s.glob({ base: "./c", pattern: "**/*.json" }),
					schema: s.stack([
						s.field({
							id: "slug",
							schema: s
								.string()
								.min(1)
								.max(40)
								.regex(/^[a-z]+$/, "i"),
						}),
						s.field({
							id: "score",
							schema: s.number().min(0).max(100).int(),
						}),
						s.field({
							id: "kind",
							schema: s.enum(["a", "b"]),
						}),
						s.field({
							id: "flag",
							schema: s.literal(true),
						}),
						s.array({
							id: "tags",
							of: s.string(),
						}),
					]),
				}),
			},
		});

		const slug = persistedShape(ir).posts?.fields.find((f) => f.id === "slug");
		expect(slug?.schema).toEqual({
			kind: "string",
			constraints: [
				{ method: "min", value: 1 },
				{ method: "max", value: 40 },
				{ method: "regex", source: "^[a-z]+$", flags: "i" },
			],
		});

		const score = persistedShape(ir).posts?.fields.find(
			(f) => f.id === "score",
		);
		expect(score?.schema).toEqual({
			kind: "number",
			constraints: [
				{ method: "min", value: 0 },
				{ method: "max", value: 100 },
				{ method: "int" },
			],
		});

		const kind = persistedShape(ir).posts?.fields.find((f) => f.id === "kind");
		expect(kind?.schema).toEqual({ kind: "enum", values: ["a", "b"] });
		expect(kind?.semanticKind).toBe("enum");

		const flag = persistedShape(ir).posts?.fields.find((f) => f.id === "flag");
		expect(flag?.schema).toEqual({ kind: "literal", value: true });

		const tags = persistedShape(ir).posts?.fields.find((f) => f.id === "tags");
		expect(tags?.schema).toEqual({
			kind: "array",
			of: { kind: "string", constraints: [] },
		});
	});

	test("rejects hand-declared discriminant fields", () => {
		try {
			compileSemanticIr({
				collections: {
					posts: s.collection({
						loader: s.glob({ base: "./c", pattern: "**/*.json" }),
						schema: s.discriminatedUnion({
							id: "hero",
							discriminant: "type",
							variants: [
								s.object({
									id: "image",
									content: [
										s.field({
											id: "type",
											schema: s.literal("image"),
										}),
										s.field({ id: "src", schema: s.image() }),
									],
								}),
							],
						}),
					}),
				},
			});
			expect.unreachable("should have thrown");
		} catch (e) {
			expect(e).toBeInstanceOf(SemanticIrError);
			const err = e as SemanticIrError;
			expect(err.issues.some((i) => i.code === "discriminant_declared")).toBe(
				true,
			);
		}
	});

	test("stores opaque component and props on compiled IR fields", () => {
		const ir = compileSemanticIr({
			collections: {
				posts: s.collection({
					loader: s.glob({ base: "./c", pattern: "**/*.json" }),
					schema: s
						.field({
							id: "body",
							schema: s.string(),
						})
						.editor("MarkdownEditor", { toolbar: ["bold"] }),
				}),
			},
		});
		const schema = ir.collections.posts?.schema;
		expect(schema?.kind).toBe("field");
		if (schema?.kind === "field") {
			expect(schema.component).toBe("MarkdownEditor");
			expect(schema.props).toEqual({ toolbar: ["bold"] });
			expect(schema.semanticKind).toBe("string");
		}
	});
});
