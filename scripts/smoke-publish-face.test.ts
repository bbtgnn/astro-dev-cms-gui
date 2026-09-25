import { describe, expect, test } from "bun:test";
import { tarballsByPackage } from "./smoke-publish-face.ts";

describe("tarballsByPackage", () => {
	test("keeps package identity when packing order changes", () => {
		const tarballs = tarballsByPackage([
			{ name: "@cms/astro", tarballPath: "/tmp/astro.tgz" },
			{ name: "@cms/core", tarballPath: "/tmp/core.tgz" },
			{ name: "@cms/authoring", tarballPath: "/tmp/authoring.tgz" },
		]);

		expect(tarballs).toEqual({
			"@cms/core": "/tmp/core.tgz",
			"@cms/authoring": "/tmp/authoring.tgz",
			"@cms/astro": "/tmp/astro.tgz",
		});
	});

	test("rejects a duplicate package tarball", () => {
		expect(() =>
			tarballsByPackage([
				{ name: "@cms/core", tarballPath: "/tmp/core-a.tgz" },
				{ name: "@cms/core", tarballPath: "/tmp/core-b.tgz" },
				{ name: "@cms/authoring", tarballPath: "/tmp/authoring.tgz" },
			]),
		).toThrow("Duplicate publish tarball for @cms/core");
	});
});
