/**
 * Compile-time fixtures for createCmsHost doors (config vs collections).
 * Expect: `bunx tsc -p ./scripts/tsconfig.fixtures.json` exits 0.
 */
import { z } from "zod";
import { defineCms } from "../define-cms/define-cms";
import type { CollectionDescriptor } from "../writer/collection-descriptors";
import { createCmsHost } from "./create-cms-protocol";

const config = defineCms((cms) => ({
	posts: cms.collection({
		schema: z.object({ title: z.string() }),
		location: { base: "posts" },
	}),
}));

const descriptor: CollectionDescriptor = {
	name: "posts",
	base: "posts",
	schema: z.object({ title: z.string() }),
	config: { base: "posts" },
};

void createCmsHost({ root: "/tmp", config });

void createCmsHost({
	root: "/tmp",
	collections: [descriptor],
	schemas: { posts: descriptor.schema },
});

void createCmsHost({
	root: "/tmp",
	collections: [descriptor],
	allowPaths: ["posts"],
});

// @ts-expect-error config and collections are mutually exclusive
void createCmsHost({
	root: "/tmp",
	config,
	collections: [descriptor],
});

// @ts-expect-error config door rejects allowPaths
void createCmsHost({
	root: "/tmp",
	config,
	allowPaths: ["posts"],
});

// @ts-expect-error collections door rejects config
void createCmsHost({
	root: "/tmp",
	collections: [descriptor],
	config,
});

// @ts-expect-error neither door — collections required without config
void createCmsHost({
	root: "/tmp",
});
