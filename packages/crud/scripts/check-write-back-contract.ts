/**
 * Portable check: write-back (#11) + read-side CMS protocol (#12) contracts.
 * Run: bun run check:allowlist
 */
import {
	type ContractRunResult,
	runReadSideProtocolContract,
	runWriteBackContract,
} from "./write-back-contract-harness";

function printResult(title: string, result: ContractRunResult): void {
	console.log(`--- ${title} ---`);
	for (const p of result.passed) {
		console.log(`ok  [${p.backend}] ${p.label}`);
	}
	for (const f of result.failures) {
		console.error(`FAIL [${f.backend}] ${f.label}: ${f.detail}`);
	}
}

const writeBack = await runWriteBackContract();
printResult("write-back contract", writeBack);

const readSide = await runReadSideProtocolContract();
printResult("read-side protocol contract", readSide);

if (!writeBack.ok || !readSide.ok) {
	process.exit(1);
}
console.log("write-back + read-side protocol contract checks passed");
