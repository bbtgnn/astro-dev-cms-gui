/**
 * Compile-time fixtures for createCmsHost doors (config vs collections).
 * Expect: `bunx tsc -p ./scripts/tsconfig.fixtures.json` exits 0.
 */
import { z } from "zod";
import { defineCms } from "../define-cms/define-cms";
import type { CollectionDescriptor } from "../writer/collection-descriptors";
import { memoryWriter } from "../writer/memory-writer";
import { createCmsHost } from "./create-cms-host";

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

const writer = memoryWriter();

void createCmsHost({ root: "/tmp", config, writer });

void createCmsHost({
	root: "/tmp",
	collections: [descriptor],
	schemas: { posts: descriptor.schema },
	writer,
});

void createCmsHost({
	root: "/tmp",
	collections: [descriptor],
	allowPaths: ["posts"],
	writer,
});

// @ts-expect-error config and collections are mutually exclusive
void createCmsHost({
	root: "/tmp",
	config,
	collections: [descriptor],
	writer,
});

// @ts-expect-error config door rejects allowPaths
void createCmsHost({
	root: "/tmp",
	config,
	allowPaths: ["posts"],
	writer,
});

// @ts-expect-error collections door rejects config
void createCmsHost({
	root: "/tmp",
	collections: [descriptor],
	config,
	writer,
});

// @ts-expect-error neither door — collections required without config
void createCmsHost({
	root: "/tmp",
	writer,
});

// @ts-expect-error writer is required
void createCmsHost({
	root: "/tmp",
	config,
});
