/**
 * CMS-first default host helpers (ADR-0019 slice 6).
 */

import { describe, expect, test } from "bun:test";
import { writeBaseFromGlob } from "../src/write-base-from-glob.ts";

describe("writeBaseFromGlob", () => {
	test("uses last path segment of Astro project-relative glob base", () => {
		expect(writeBaseFromGlob("./src/content/posts", "posts")).toBe("posts");
		expect(writeBaseFromGlob("./src/content/authors", "authors")).toBe(
			"authors",
		);
	});

	test("falls back to collection id when base is empty-ish", () => {
		expect(writeBaseFromGlob(".", "posts")).toBe("posts");
		expect(writeBaseFromGlob("", "authors")).toBe("authors");
	});
});
