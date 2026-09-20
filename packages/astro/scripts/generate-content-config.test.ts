/**
 * Generate + hash + --check + partition load (ADR-0019 slice 3).
 */

import { afterEach, describe, expect, test } from "bun:test";
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileSemanticIr, s } from "@cms/core/semantic";
import {
	atomicWriteFile,
	extractEmbeddedHash,
	generateContentConfig,
	HASH_MARKER,
	loadSchemaPartition,
	sha256OfFiles,
} from "../src/generate/index.ts";

const temps: string[] = [];
const FIXTURE_PARTITION = join(
	dirname(fileURLToPath(import.meta.url)),
	"fixtures/cms.schema.ts",
);

function tempProject(): string {
	const root = mkdtempSync(join(tmpdir(), "cms-generate-"));
	temps.push(root);
	mkdirSync(join(root, "src"), { recursive: true });
	return root;
}

afterEach(() => {
	while (temps.length > 0) {
		const root = temps.pop();
		if (root !== undefined) {
			rmSync(root, { recursive: true, force: true });
		}
	}
});

function sampleIr() {
	return compileSemanticIr({
		collections: {
			posts: s.collection({
				loader: s.glob({
					base: "./src/content/posts",
					pattern: "**/*.json",
				}),
				schema: s.stack([
					s.field({ id: "title", schema: s.string().min(1) }),
					s.field({ id: "cover", schema: s.image().optional() }),
				]),
			}),
		},
	});
}

describe("loadSchemaPartition", () => {
	test("loads collections from a Svelte-free partition module", async () => {
		const ir = await loadSchemaPartition(FIXTURE_PARTITION);
		expect(Object.keys(ir.persisted).sort()).toEqual(["authors", "posts"]);
		expect(ir.persisted.posts?.fields.map((f) => f.id)).toEqual([
			"title",
			"cover",
			"author",
		]);
	});

	test("rejects modules without collections or ir", async () => {
		const root = tempProject();
		const partitionPath = join(root, "src/cms.schema.ts");
		writeFileSync(
			partitionPath,
			`export const note = "not a partition";\n`,
			"utf8",
		);

		await expect(loadSchemaPartition(partitionPath)).rejects.toThrow(
			/missing "collections" or "ir"/,
		);
	});
});

describe("generateContentConfig", () => {
	test("writes atomically, --check passes when fresh, fails after partition mutation", async () => {
		const root = tempProject();
		const partitionPath = join(root, "src/cms.schema.ts");
		const contentConfigPath = join(root, "src/content.config.ts");
		// Hash input lives in the temp project; IR is supplied so we do not
		// dynamically import from outside the workspace graph.
		copyFileSync(FIXTURE_PARTITION, partitionPath);
		const ir = sampleIr();

		const first = await generateContentConfig({
			projectRoot: root,
			ir,
			schemaSources: [partitionPath],
		});
		expect(first.wrote).toBe(true);
		expect(first.stale).toBe(true);

		const written = readFileSync(contentConfigPath, "utf8");
		expect(written).toContain(`// ${HASH_MARKER} ${first.sourceHash}`);
		expect(written).toContain("export const postsSchema");
		expect(written).toContain("image().optional()");
		expect(extractEmbeddedHash(written)).toBe(first.sourceHash);

		const checkFresh = await generateContentConfig({
			projectRoot: root,
			ir,
			schemaSources: [partitionPath],
			checkOnly: true,
		});
		expect(checkFresh.stale).toBe(false);
		expect(checkFresh.wrote).toBe(false);

		const skip = await generateContentConfig({
			projectRoot: root,
			ir,
			schemaSources: [partitionPath],
		});
		expect(skip.wrote).toBe(false);
		expect(skip.stale).toBe(false);

		writeFileSync(
			partitionPath,
			`${readFileSync(partitionPath, "utf8")}\n// touched\n`,
			"utf8",
		);
		const checkStale = await generateContentConfig({
			projectRoot: root,
			ir,
			schemaSources: [partitionPath],
			checkOnly: true,
		});
		expect(checkStale.stale).toBe(true);
		expect(checkStale.wrote).toBe(false);
		expect(checkStale.sourceHash).not.toBe(first.sourceHash);

		expect(readFileSync(contentConfigPath, "utf8")).toBe(written);
	});

	test("loads partition via generateContentConfig when ir is omitted", async () => {
		const root = tempProject();
		const out = join(root, "src/content.config.ts");
		const result = await generateContentConfig({
			projectRoot: root,
			schemaPartitionPath: FIXTURE_PARTITION,
			schemaSources: [FIXTURE_PARTITION],
			contentConfigPath: out,
		});
		expect(result.wrote).toBe(true);
		const written = readFileSync(out, "utf8");
		expect(written).toContain("export const postsSchema");
		expect(written).toContain('reference("authors")');
	});

	test("atomicWriteFile leaves destination intact as a complete write", () => {
		const root = tempProject();
		const dest = join(root, "src/out.ts");
		const body = "// complete file\nexport const x = 1;\n";
		atomicWriteFile(dest, body);
		expect(readFileSync(dest, "utf8")).toBe(body);

		const next = "// replaced\nexport const x = 2;\n";
		atomicWriteFile(dest, next);
		expect(readFileSync(dest, "utf8")).toBe(next);
	});

	test("sha256OfFiles is stable for the same inputs", () => {
		const root = tempProject();
		const a = join(root, "a.ts");
		writeFileSync(a, "export const x = 1;\n", "utf8");
		const h1 = sha256OfFiles([a]);
		const h2 = sha256OfFiles([a]);
		expect(h1).toBe(h2);
		expect(h1).toMatch(/^[a-f0-9]{64}$/);
	});
});
