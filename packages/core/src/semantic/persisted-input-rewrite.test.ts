/**
 * Persisted-Input rewrite: stamped Zod → authoritative Input (paths / ids).
 * Peer of schema-form-projection; host injects existence checks via deps.
 */
import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { CONTENT_FIELD_STAMP } from "./content-field-stamp";
import { toPersistedInputSchema } from "./persisted-input-rewrite";

function stampImage<T extends z.ZodType>(schema: T): T {
	const withMeta = schema.meta({ cms: { kind: "image" as const } }) as T;
	(withMeta as { [key: symbol]: unknown })[CONTENT_FIELD_STAMP] = {
		kind: "image",
	};
	return withMeta;
}

function stampReference<T extends z.ZodType>(schema: T, collection: string): T {
	const withMeta = schema.meta({
		cms: { kind: "reference" as const, collection },
	}) as T;
	(withMeta as { [key: symbol]: unknown })[CONTENT_FIELD_STAMP] = {
		kind: "reference",
		collection,
	};
	return withMeta;
}

describe("toPersistedInputSchema", () => {
	test("rewrites stamped image Output object and reference to Input strings", async () => {
		const schema = z.object({
			title: z.string().min(1),
			cover: stampImage(
				z.object({
					src: z.string(),
					width: z.number(),
					height: z.number(),
					format: z.string(),
				}),
			).optional(),
			author: stampReference(z.string(), "authors"),
		});

		const input = toPersistedInputSchema(schema, undefined, "");

		const ok = await input.safeParseAsync({
			title: "Hello",
			author: "ada",
			cover: "./cover.jpg",
		});
		expect(ok.success).toBe(true);

		const badShape = await input.safeParseAsync({
			title: "Hello",
			author: "ada",
			cover: {
				src: "./cover.jpg",
				width: 10,
				height: 10,
				format: "jpg",
			},
		});
		expect(badShape.success).toBe(false);
	});

	test("injects image/ref existence checks via deps", async () => {
		const schema = z.object({
			cover: stampImage(z.string()).optional(),
			author: stampReference(z.string(), "authors"),
		});

		const accepted = new Set(["./ok.jpg"]);
		const authors = new Set(["ada"]);
		const input = toPersistedInputSchema(
			schema,
			{
				isAcceptedImageAsset: (p) => accepted.has(p),
				entryExists: async (collection, id) =>
					collection === "authors" && authors.has(id),
			},
			"",
		);

		expect(
			(
				await input.safeParseAsync({
					author: "ada",
					cover: "./ok.jpg",
				})
			).success,
		).toBe(true);

		expect(
			(
				await input.safeParseAsync({
					author: "nobody",
					cover: "./ok.jpg",
				})
			).success,
		).toBe(false);

		expect(
			(
				await input.safeParseAsync({
					author: "ada",
					cover: "./missing.jpg",
				})
			).success,
		).toBe(false);
	});

	test("walks nested objects and arrays; preserves optional wrappers", async () => {
		const schema = z.object({
			items: z.array(
				z.object({
					thumb: stampImage(z.string()).optional(),
				}),
			),
			meta: z
				.object({
					hero: stampImage(z.string()).nullable(),
				})
				.optional(),
		});

		const input = toPersistedInputSchema(schema, undefined, "");

		const ok = await input.safeParseAsync({
			items: [{ thumb: "./a.jpg" }, {}],
			meta: { hero: null },
		});
		expect(ok.success).toBe(true);

		const missingItems = await input.safeParseAsync({
			meta: { hero: "./h.jpg" },
		});
		expect(missingItems.success).toBe(false);
	});
});
