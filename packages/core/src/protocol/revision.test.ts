/**
 * Opaque revision stability — Web Crypto, no Node (issue #33).
 */
import { describe, expect, test } from "bun:test";
import { opaqueRevision } from "./revision";

describe("opaqueRevision", () => {
	test("same UTF-8 bytes yield the same hex digest", async () => {
		const a = await opaqueRevision('{"title":"hello"}');
		const b = await opaqueRevision('{"title":"hello"}');
		expect(a).toBe(b);
		expect(a).toMatch(/^[0-9a-f]{64}$/);
	});

	test("different bytes yield different digests", async () => {
		const a = await opaqueRevision('{"title":"hello"}');
		const b = await opaqueRevision('{"title":"world"}');
		expect(a).not.toBe(b);
	});

	test("matches known SHA-256 of empty string", async () => {
		// echo -n '' | shasum -a 256
		expect(await opaqueRevision("")).toBe(
			"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		);
	});
});
