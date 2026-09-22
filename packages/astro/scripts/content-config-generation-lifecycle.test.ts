/**
 * cms() generation lifecycle in astro:config:setup (ADR-0016 / 0019).
 *
 * Seam: runContentConfigGeneration + cms / cmsHarness setup hooks.
 * Does not require the Astro binary; invokes the hook with mocked params.
 */

import { afterEach, describe, expect, test } from "bun:test";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	extractEmbeddedHash,
	generateContentConfig,
	HASH_MARKER,
	runContentConfigGeneration,
	SCHEMA_PARTITION_CONVENTION,
} from "../src/generate/index.ts";
import { cms } from "../src/integration";
import { cmsHarness } from "../src/testing";

const temps: string[] = [];
const FIXTURE_PARTITION = join(
	dirname(fileURLToPath(import.meta.url)),
	"fixtures/cms.config.ts",
);

function tempProject(): string {
	const root = mkdtempSync(join(tmpdir(), "cms-lifecycle-"));
	temps.push(root);
	mkdirSync(join(root, "src"), { recursive: true });
	return root;
}

/**
 * Temp partitions cannot resolve workspace `@cms/core/semantic`.
 * Re-export the in-package fixture so dynamic import stays graph-valid;
 * the temp file remains the hash input (mutation still changes the hash).
 */
function writePartitionReexport(dest: string): void {
	writeFileSync(
		dest,
		`export { collections } from ${JSON.stringify(FIXTURE_PARTITION)};\n`,
		"utf8",
	);
}

afterEach(() => {
	while (temps.length > 0) {
		const root = temps.pop();
		if (root !== undefined) {
			rmSync(root, { recursive: true, force: true });
		}
	}
});

function mockSetupParams(root: string) {
	const calls: {
		updateConfig: unknown[];
		addMiddleware: unknown[];
		injectRoute: unknown[];
	} = {
		updateConfig: [],
		addMiddleware: [],
		injectRoute: [],
	};
	return {
		calls,
		params: {
			config: { root },
			updateConfig: (config: unknown) => {
				calls.updateConfig.push(config);
			},
			addMiddleware: (mw: unknown) => {
				calls.addMiddleware.push(mw);
			},
			injectRoute: (route: unknown) => {
				calls.injectRoute.push(route);
			},
		},
	};
}

describe("runContentConfigGeneration", () => {
	test("writes content.config.ts from convention partition when missing", async () => {
		const root = tempProject();
		writePartitionReexport(join(root, SCHEMA_PARTITION_CONVENTION));

		const outcome = await runContentConfigGeneration({ projectRoot: root });
		expect(outcome.status).toBe("generated");
		if (outcome.status !== "generated") return;

		const contentConfigPath = join(root, "src/content.config.ts");
		expect(existsSync(contentConfigPath)).toBe(true);
		expect(outcome.result.wrote).toBe(true);
		expect(outcome.result.contentConfigPath).toBe(contentConfigPath);

		const written = readFileSync(contentConfigPath, "utf8");
		expect(written).toContain(`// ${HASH_MARKER}`);
		expect(written).toContain("export const postsSchema");
		expect(written).toContain('reference("authors")');
		expect(extractEmbeddedHash(written)).toBe(outcome.result.sourceHash);
	});

	test("skips cleanly when no schema partition exists", async () => {
		const root = tempProject();
		const outcome = await runContentConfigGeneration({ projectRoot: root });
		expect(outcome).toEqual({
			status: "skipped",
			reason: "no-partition",
		});
		expect(existsSync(join(root, "src/content.config.ts"))).toBe(false);
	});

	test("skips when generation is disabled even if partition exists", async () => {
		const root = tempProject();
		writePartitionReexport(join(root, SCHEMA_PARTITION_CONVENTION));

		const outcome = await runContentConfigGeneration({
			projectRoot: root,
			schemaPartition: false,
		});
		expect(outcome).toEqual({
			status: "skipped",
			reason: "disabled",
		});
		expect(existsSync(join(root, "src/content.config.ts"))).toBe(false);
	});

	test("regenerates after partition mutation; checkOnly reports stale before write", async () => {
		const root = tempProject();
		const partitionPath = join(root, SCHEMA_PARTITION_CONVENTION);
		writePartitionReexport(partitionPath);

		const first = await runContentConfigGeneration({ projectRoot: root });
		expect(first.status).toBe("generated");
		if (first.status !== "generated") return;

		const contentConfigPath = join(root, "src/content.config.ts");
		const before = readFileSync(contentConfigPath, "utf8");

		writeFileSync(
			partitionPath,
			`${readFileSync(partitionPath, "utf8")}\n// touched\n`,
			"utf8",
		);

		const staleCheck = await generateContentConfig({
			projectRoot: root,
			checkOnly: true,
		});
		expect(staleCheck.stale).toBe(true);
		expect(staleCheck.wrote).toBe(false);
		expect(readFileSync(contentConfigPath, "utf8")).toBe(before);

		const second = await runContentConfigGeneration({ projectRoot: root });
		expect(second.status).toBe("generated");
		if (second.status !== "generated") return;
		expect(second.result.wrote).toBe(true);
		expect(second.result.sourceHash).not.toBe(first.result.sourceHash);
		expect(readFileSync(contentConfigPath, "utf8")).not.toBe(before);
	});

	test("throws when partition exists but is invalid", async () => {
		const root = tempProject();
		writeFileSync(
			join(root, SCHEMA_PARTITION_CONVENTION),
			`export const note = "not a partition";\n`,
			"utf8",
		);

		await expect(
			runContentConfigGeneration({ projectRoot: root }),
		).rejects.toThrow(/missing "collections" or "ir"/);
	});

	test("honors explicit schemaPartition path", async () => {
		const root = tempProject();
		const custom = join(root, "src/custom-schema.ts");
		writePartitionReexport(custom);

		const outcome = await runContentConfigGeneration({
			projectRoot: root,
			schemaPartition: custom,
		});
		expect(outcome.status).toBe("generated");
		if (outcome.status !== "generated") return;
		expect(outcome.result.schemaPartitionPath).toBe(custom);
		expect(existsSync(join(root, "src/content.config.ts"))).toBe(true);
	});
});

describe("cms() astro:config:setup", () => {
	test("calls generation before returning; bootstraps missing content.config", async () => {
		const root = tempProject();
		writePartitionReexport(join(root, SCHEMA_PARTITION_CONVENTION));

		const integration = cms();
		const hook = integration.hooks?.["astro:config:setup"];
		expect(hook).toBeTypeOf("function");
		if (hook == null) throw new Error("expected setup hook");

		const { params, calls } = mockSetupParams(root);
		const contentConfigPath = join(root, "src/content.config.ts");
		expect(existsSync(contentConfigPath)).toBe(false);

		await hook(params);

		expect(existsSync(contentConfigPath)).toBe(true);
		const written = readFileSync(contentConfigPath, "utf8");
		expect(written).toContain("export const postsSchema");
		expect(written).toContain(`// ${HASH_MARKER}`);
		expect(calls.addMiddleware.length).toBe(1);
		expect(calls.injectRoute.length).toBe(1);
	});

	test("hard-fails when cms.config is missing", async () => {
		const root = tempProject();
		writeFileSync(
			join(root, "src/content.config.ts"),
			`export const collections = {};\n`,
			"utf8",
		);

		const integration = cms();
		const hook = integration.hooks?.["astro:config:setup"];
		if (hook == null) throw new Error("expected setup hook");

		await expect(hook(mockSetupParams(root).params)).rejects.toThrow(
			/requires editor configuration/,
		);
	});
});

describe("cmsHarness escapes", () => {
	test("generate: false disables generation in setup", async () => {
		const root = tempProject();
		writePartitionReexport(join(root, SCHEMA_PARTITION_CONVENTION));

		const integration = cmsHarness({
			shellPath: false,
			host: false,
			generate: false,
		});
		const hook = integration.hooks?.["astro:config:setup"];
		if (hook == null) throw new Error("expected setup hook");

		await hook(mockSetupParams(root).params);
		expect(existsSync(join(root, "src/content.config.ts"))).toBe(false);
	});

	test("skips generation when no config (no requireConfig)", async () => {
		const root = tempProject();
		writeFileSync(
			join(root, "src/content.config.ts"),
			`export const collections = {};\n`,
			"utf8",
		);

		const integration = cmsHarness({
			shellPath: false,
			host: false,
		});
		const hook = integration.hooks?.["astro:config:setup"];
		if (hook == null) throw new Error("expected setup hook");

		await hook(mockSetupParams(root).params);

		expect(readFileSync(join(root, "src/content.config.ts"), "utf8")).toBe(
			`export const collections = {};\n`,
		);
	});
});
