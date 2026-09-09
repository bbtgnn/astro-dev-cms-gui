/**
 * PROTOTYPE / SPIKE — fake catalog + path map for tracer bullets.
 * Real content.config discovery is out of scope (tickets 07/08).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWriteMode, memoryWriter, nodeFsWriter } from "@cms/crud";
import { prototypePostsSchema } from "@cms/fields";

const here = path.dirname(fileURLToPath(import.meta.url));
export const contentRoot = path.resolve(here, "../../content-sandbox");

/** Allowlisted write roots (under content-sandbox only). */
export const allowPaths = ["posts", "data"];

export const fakeCatalog = {
	posts: [
		{
			id: "hello",
			collection: "posts",
			data: {
				title: "Hello tracer",
				draft: true,
				body: "Pass 1 fake entry.",
			},
		},
	],
	authors: [
		{
			id: "ada",
			collection: "authors",
			data: { name: "Ada" },
		},
	],
};

/** Stub (collection, id) → path relative to contentRoot. */
export const pathMap: Record<string, Record<string, string>> = {
	posts: {
		hello: "posts/hello.json",
		"new-post": "posts/new-post.json",
		// Track D: mapped but outside allowPaths → HTTP 403
		blocked: "../blocked.json",
	},
	// deliberately NOT mapping authors/* so upsert without map 404s
};

export function createTemplateWriteMode(opts?: { useMemory?: boolean }) {
	const writer = opts?.useMemory ? memoryWriter() : nodeFsWriter();

	return createWriteMode({
		root: contentRoot,
		allowPaths,
		writer,
		pathMap,
		fakeCatalog,
		schemas: {
			posts: prototypePostsSchema,
		},
	});
}
