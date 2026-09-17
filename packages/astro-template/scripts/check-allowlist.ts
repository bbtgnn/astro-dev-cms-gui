/**
 * Thin entrypoint → `@cms/crud` write-back contracts (bun:test, issue #11).
 * Run: bun run check:allowlist
 */
import path from "node:path";

const testFile = path.resolve(
	import.meta.dir,
	"../../crud/scripts/write-back-contract.test.ts",
);
const result = Bun.spawnSync(["bun", "test", testFile], {
	stdio: ["inherit", "inherit", "inherit"],
});
process.exit(result.exitCode);
