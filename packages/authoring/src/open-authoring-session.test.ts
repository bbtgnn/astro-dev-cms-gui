/**
 * Fail-closed openAuthoringSession (ADR-0014).
 * Null schema → no session; present schema → eligibility-gated write-back.
 */

import { describe, expect, test } from "bun:test";
import { openAuthoringSession } from "./open-authoring-session";
import {
	createFakeTimers,
	sampleEntry,
	waitUntil,
} from "./testing/authoring-test-fixtures";
import { createFakeClient } from "./testing/fake-client";

const titleEditorSchema = {
	schema: {
		type: "object",
		properties: { title: { type: "string", minLength: 1 } },
		required: ["title"],
		additionalProperties: false,
	} satisfies Record<string, unknown>,
};

describe("openAuthoringSession", () => {
	test("null schema → null (no session)", () => {
		const fake = createFakeClient({ entries: [sampleEntry] });
		const session = openAuthoringSession({
			schema: null,
			client: fake.client,
			collection: "posts",
			mode: { kind: "edit", entry: sampleEntry },
		});
		expect(session).toBeNull();
		expect(fake.upsertCalls).toHaveLength(0);
	});

	test("present schema → session gates on eligibility", async () => {
		const fake = createFakeClient({ entries: [sampleEntry] });
		const clock = createFakeTimers();
		const session = openAuthoringSession({
			schema: titleEditorSchema,
			client: fake.client,
			collection: "posts",
			mode: { kind: "edit", entry: sampleEntry },
			debounceMs: 50,
			timers: clock.timers,
		});

		expect(session).not.toBeNull();
		if (!session) return;

		session.handleChange({ title: "" });
		clock.advance(50);
		await waitUntil(
			() => session.getSnapshot().saveStatus === "client_invalid",
			"empty title invalid",
		);
		expect(fake.upsertCalls).toHaveLength(0);

		session.handleChange({ title: "Valid title" });
		clock.advance(50);
		await waitUntil(
			() => session.getSnapshot().saveStatus === "saved",
			"valid title saves",
		);
		expect(fake.upsertCalls).toHaveLength(1);

		session.dispose();
	});

	test("create: valid title + create id writes back", async () => {
		const fake = createFakeClient({ entries: [] });
		const clock = createFakeTimers();
		const session = openAuthoringSession({
			schema: titleEditorSchema,
			client: fake.client,
			collection: "posts",
			mode: { kind: "create" },
			debounceMs: 50,
			timers: clock.timers,
		});

		expect(session).not.toBeNull();
		if (!session) return;

		session.handleChange({ title: "New" });
		clock.advance(50);
		await waitUntil(
			() => session.getSnapshot().saveStatus === "client_invalid",
			"create without id",
		);
		expect(fake.upsertCalls).toHaveLength(0);

		session.setCreateId("opened");
		clock.advance(50);
		await waitUntil(
			() =>
				!session.getSnapshot().creating &&
				session.getSnapshot().saveStatus === "saved",
			"create save",
		);
		expect(fake.upsertCalls).toHaveLength(1);
		expect(fake.upsertCalls[0]?.expectedRevision).toBeNull();

		session.dispose();
	});
});
