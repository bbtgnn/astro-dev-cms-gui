/**
 * Portable check: write-back contract harness (memory + filesystem).
 * Run: bun run check:allowlist
 */
import {
	type ContractRunResult,
	runWriteBackContract,
} from "./write-back-contract-harness";

function printResult(result: ContractRunResult): void {
	for (const p of result.passed) {
		console.log(`ok  [${p.backend}] ${p.label}`);
	}
	for (const f of result.failures) {
		console.error(`FAIL [${f.backend}] ${f.label}: ${f.detail}`);
	}
}

const result = await runWriteBackContract();
printResult(result);

if (!result.ok) {
	process.exit(1);
}
console.log("write-back contract checks passed");
