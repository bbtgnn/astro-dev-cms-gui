/**
 * PROTOTYPE — assert allowlist refuses paths outside content-sandbox/posts.
 * Run: bun run check:allowlist
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWriteMode, memoryWriter } from "../../crud/src/index";

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

const wm = createWriteMode({
	root,
	allowPaths: ["posts"],
	writer: memoryWriter(),
	pathMap: {
		posts: {
			ok: "posts/ok.json",
			evil: "../evil.json",
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

const writer = memoryWriter();
const okMode = createWriteMode({
	root,
	allowPaths: ["posts"],
	writer,
	pathMap: { posts: { ok: "posts/ok.json" } },
});

await okMode.upsertEntry({
	id: "ok",
	collection: "posts",
	data: { title: "yes" },
});

const written = writer.store.get(path.join(root, "posts/ok.json"));
if (!written) {
	console.error("FAIL allowed write did not land in memory writer");
	failed = true;
} else {
	console.log("ok  allowlisted upsert wrote", written.trim());
}

if (failed) {
	process.exit(1);
}
console.log("allowlist checks passed");
