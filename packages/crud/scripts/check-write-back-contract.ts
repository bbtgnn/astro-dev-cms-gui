/**
 * Portable check: write-back (#11) + CMS protocol read (#12) + write (#13)
 * + deletion capability (#16) + assets capability (#17).
 * Run: bun run check:allowlist
 */
import {
	type ContractRunResult,
	runAssetsCapabilityContract,
	runDeletionCapabilityContract,
	runReadSideProtocolContract,
	runWriteBackContract,
	runWriteSideProtocolContract,
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

const writeSide = await runWriteSideProtocolContract();
printResult("write-side protocol contract", writeSide);

const deletion = await runDeletionCapabilityContract();
printResult("deletion capability contract", deletion);

const assets = await runAssetsCapabilityContract();
printResult("assets capability contract", assets);

if (
	!writeBack.ok ||
	!readSide.ok ||
	!writeSide.ok ||
	!deletion.ok ||
	!assets.ok
) {
	process.exit(1);
}
console.log(
	"write-back + read-side + write-side + deletion + assets capability contract checks passed",
);
