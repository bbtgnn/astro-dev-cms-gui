/**
 * Host facade: `defineCms` from `@cms/astro/config` feeds `compileSemanticIr`.
 */

import { describe, expect, test } from "bun:test";
import { compileSemanticIr } from "@cms/core/semantic";
import { defineCms } from "../src/config.ts";

describe("defineCms", () => {
	test("returns collections that compileSemanticIr accepts", () => {
		const config = defineCms<"posts" | "authors">((s) => ({
			collections: {
				posts: s.collection({
					loader: s.glob({
						base: "./src/content/posts",
						pattern: "**/*.json",
					}),
					schema: s.stack([
						s.field({ id: "title", schema: s.string().min(1) }),
						s.field({
							id: "author",
							schema: s.reference("authors"),
						}),
					]),
				}),
			},
		}));

		const ir = compileSemanticIr({ collections: config.collections });
		expect(ir.persisted.posts?.fields.map((f) => f.id)).toEqual([
			"title",
			"author",
		]);
	});
});
