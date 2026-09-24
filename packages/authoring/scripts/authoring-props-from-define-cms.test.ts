/**
 * Seam: authoringPropsFromDefineCms → AuthoringApp props.
 */
import { describe, expect, test } from "bun:test";
import { defineCms } from "@cms/core/define-cms";
import { z } from "zod";
import { authoringPropsFromDefineCms } from "../src/authoring-props-from-define-cms";
import type { AuthoringClient } from "../src/types";

const stubClient = {
	getCapabilities: async () => ({ ok: true as const, value: {} as never }),
	listCollections: async () => ({ ok: true as const, value: [] }),
	listEntries: async () => ({ ok: true as const, value: [] }),
	getEntry: async () => ({
		ok: false as const,
		code: "not_found" as const,
		message: "",
	}),
	upsertEntry: async () => ({
		ok: false as const,
		code: "not_found" as const,
		message: "",
	}),
	deleteEntry: async () => ({
		ok: false as const,
		code: "not_found" as const,
		message: "",
	}),
	uploadImage: async () => ({
		ok: false as const,
		code: "not_found" as const,
		message: "",
	}),
} satisfies AuthoringClient;

describe("authoringPropsFromDefineCms", () => {
	test("builds collections + multiplexed getPreviewUrl from defineCms", () => {
		const config = defineCms((cms) => ({
			authors: cms.collection({
				schema: z.object({ name: z.string() }),
				location: { base: "authors" },
				form: (f) => [f.field("name").label("Name")],
			}),
			posts: cms.collection({
				schema: z.object({ title: z.string() }),
				location: { base: "posts" },
				previewUrl: (id) => `/posts/${id}`,
				form: (f) => [f.field("title").label("Title")],
			}),
		}));

		const props = authoringPropsFromDefineCms(
			config,
			{},
			{ client: stubClient },
		);

		expect(props.client).toBe(stubClient);
		expect(Object.keys(props.collections).sort()).toEqual(["authors", "posts"]);
		expect(props.collections.posts?.schema).toMatchObject({
			type: "object",
		});
		expect(props.getPreviewUrl("posts", "hello")).toBe("/posts/hello");
		expect(props.getPreviewUrl("authors", "ada")).toBeNull();
	});
});
