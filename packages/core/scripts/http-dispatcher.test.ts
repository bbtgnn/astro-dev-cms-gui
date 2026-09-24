/**
 * Seam: createCmsDispatcher — protocol ↔ HTTP under /cms/api mount.
 */
import { describe, expect, test } from "bun:test";
import path from "node:path";
import { z } from "zod";
import { createCmsHost } from "../src/create-cms-protocol";
import { defineCms } from "../src/define-cms";
import {
	createCmsDispatcher,
	createCmsHttpFromConfig,
	DEFAULT_CMS_API_MOUNT,
} from "../src/http";
import { memoryWriter } from "../src/memory-writer";

const MEMORY_ROOT = path.resolve("/cms-http-dispatcher-memory");

function testHost() {
	const config = defineCms((cms) => ({
		posts: cms.collection({
			schema: z.object({ title: z.string() }),
			location: { base: "posts" },
		}),
	}));
	const writer = memoryWriter({
		[path.join(MEMORY_ROOT, "posts/hello.json")]: JSON.stringify({
			title: "Hello",
		}),
	});
	return createCmsHost({ root: MEMORY_ROOT, config, writer });
}

describe("createCmsDispatcher", () => {
	test("default mount is /cms/api", async () => {
		const host = testHost();
		const dispatch = createCmsDispatcher({
			host,
			isDev: true,
		});
		const res = await dispatch(new Request("http://x/cms/api/ok"), ["ok"]);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { ok: boolean; mount: string };
		expect(body).toEqual({ ok: true, mount: DEFAULT_CMS_API_MOUNT });
	});

	test("lists collections under /collections (no nested /api)", async () => {
		const host = testHost();
		const dispatch = createCmsDispatcher({
			host,
			isDev: true,
		});
		const res = await dispatch(new Request("http://x/cms/api/collections"), [
			"collections",
		]);
		expect(res.status).toBe(200);
		const body = (await res.json()) as Array<{ name: string }>;
		expect(body.map((c) => c.name)).toEqual(["posts"]);
	});

	test("gets an entry at collections/:name/:id", async () => {
		const host = testHost();
		const dispatch = createCmsDispatcher({
			host,
			isDev: true,
		});
		const res = await dispatch(
			new Request("http://x/cms/api/collections/posts/hello"),
			["collections", "posts", "hello"],
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			id: string;
			collection: string;
			data: { title: string };
		};
		expect(body.id).toBe("hello");
		expect(body.collection).toBe("posts");
		expect(body.data.title).toBe("Hello");
	});

	test("blocks outside DEV unless allowInProd", async () => {
		const host = testHost();
		const dispatch = createCmsDispatcher({
			host,
			isDev: false,
		});
		const res = await dispatch(new Request("http://x/cms/api/ok"), ["ok"]);
		expect(res.status).toBe(403);
	});
});

describe("createCmsHost({ config })", () => {
	test("derives allowPaths from collection bases", async () => {
		const config = defineCms((cms) => ({
			authors: cms.collection({
				schema: z.object({ name: z.string() }),
				location: { base: "authors" },
			}),
			posts: cms.collection({
				schema: z.object({ title: z.string() }),
				location: { base: "posts" },
			}),
		}));
		const writer = memoryWriter({
			[path.join(MEMORY_ROOT, "authors/ada.json")]: JSON.stringify({
				name: "Ada",
			}),
		});
		const host = createCmsHost({ root: MEMORY_ROOT, config, writer });
		const listed = await host.protocol.listCollections();
		expect(listed.value.map((c) => c.name).sort()).toEqual([
			"authors",
			"posts",
		]);
		const entry = await host.protocol.getEntry("authors", "ada");
		expect(entry.ok).toBe(true);
		if (entry.ok) expect(entry.value.data).toEqual({ name: "Ada" });
	});
});

describe("createCmsHttpFromConfig", () => {
	test("pairs host + dispatch from the config door", async () => {
		const config = defineCms((cms) => ({
			posts: cms.collection({
				schema: z.object({ title: z.string() }),
				location: { base: "posts" },
			}),
		}));
		const writer = memoryWriter({
			[path.join(MEMORY_ROOT, "posts/hello.json")]: JSON.stringify({
				title: "Hello",
			}),
		});
		const { host, dispatch } = createCmsHttpFromConfig({
			config,
			root: MEMORY_ROOT,
			isDev: true,
			writer,
		});

		const listed = await host.protocol.listCollections();
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		expect(listed.value.map((c) => c.name)).toEqual(["posts"]);

		const res = await dispatch(new Request("http://x/cms/api/ok"), ["ok"]);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { ok: boolean; mount: string };
		expect(body).toEqual({ ok: true, mount: DEFAULT_CMS_API_MOUNT });
	});
});
