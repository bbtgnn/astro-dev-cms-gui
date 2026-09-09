/**
 * PROTOTYPE — assert allowlist refuses paths outside content-sandbox/posts.
 * Run: bun run check:allowlist
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
	createWriteMode,
	type DiscoveredCollection,
	memoryWriter,
	parseEntryFile,
} from "../../crud/src/index";

const root = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../content-sandbox",
);

let failed = false;

async function expectReject(
	label: string,
	fn: () => Promise<unknown>,
	status = 403,
) {
	try {
		await fn();
		console.error(`FAIL ${label}: expected rejection`);
		failed = true;
	} catch (err) {
		const e = err as { status?: number; message?: string };
		if (e.status === status) {
			console.log(`ok  ${label} → ${status} ${e.message}`);
		} else {
			console.error(`FAIL ${label}: status=${e.status} msg=${e.message}`);
			failed = true;
		}
	}
}

const postsSchema = z.object({
	title: z.string(),
});

const postsCollection: DiscoveredCollection = {
	name: "posts",
	label: "Posts",
	schema: postsSchema,
	base: "posts",
	config: { label: "Posts", base: "posts" },
};

const wm = createWriteMode({
	root,
	allowPaths: ["posts"],
	writer: memoryWriter(),
	pathMap: {
		posts: {
			ok: "posts/ok.yaml",
			evil: "../evil.yaml",
		},
		secrets: {
			env: "../../.env",
		},
	},
});

await expectReject("traversal escapes allowlist", () =>
	wm.upsertEntry({
		id: "evil",
		collection: "posts",
		data: { title: "nope" },
	}),
);

await expectReject("path outside allowlist roots", () =>
	wm.upsertEntry({
		id: "env",
		collection: "secrets",
		data: { x: 1 },
	}),
);

await expectReject(
	"unsafe nested id",
	() =>
		wm.upsertEntry({
			id: "../escape",
			collection: "posts",
			data: { title: "nope" },
		}),
	400,
);

const writer = memoryWriter();
const okMode = createWriteMode({
	root,
	allowPaths: ["posts"],
	writer,
	collections: [postsCollection],
});

await okMode.upsertEntry({
	id: "ok",
	collection: "posts",
	data: { title: "yes" },
});

const written = writer.store.get(path.join(root, "posts/ok.yaml"));
if (!written) {
	console.error("FAIL discovery upsert did not land in memory writer");
	failed = true;
} else {
	try {
		const data = parseEntryFile(written);
		if (data.title !== "yes") {
			console.error("FAIL YAML round-trip title mismatch", data);
			failed = true;
		} else {
			console.log("ok  discovery upsert wrote YAML", written.trim());
		}
	} catch (err) {
		console.error("FAIL written body is not YAML", err);
		failed = true;
	}
}

const listed = await okMode.listEntries("posts");
if (!listed.some((e) => e.id === "ok")) {
	console.error("FAIL FS scan listEntries missing ok", listed);
	failed = true;
} else {
	console.log("ok  FS scan listEntries includes ok");
}

const colls = await okMode.listCollections();
if (!colls.some((c) => c.name === "posts" && c.label === "Posts")) {
	console.error("FAIL listCollections missing posts label", colls);
	failed = true;
} else {
	console.log("ok  listCollections returns discovered posts");
}

const collideWriter = memoryWriter({
	[path.join(root, "posts/both.yaml")]: "title: a\n",
	[path.join(root, "posts/both.yml")]: "title: b\n",
});
const collideMode = createWriteMode({
	root,
	allowPaths: ["posts"],
	writer: collideWriter,
	collections: [postsCollection],
});

await expectReject(
	"yaml+yml collision",
	() => collideMode.getEntry("posts", "both"),
	409,
);

if (failed) {
	process.exit(1);
}
console.log("allowlist checks passed");
