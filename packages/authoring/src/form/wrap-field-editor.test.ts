/**
 * Regression: wrapFieldEditorForSjsf must preserve Svelte 5 $bindable accessors.
 *
 * Symptom: editing a field + submit does nothing — field.set updates a snapshot
 * from `{ ...props }`, so SJSF form value / write-back never see the change.
 */

import { describe, expect, test } from "bun:test";
import {
	injectEditorIntoWidgetProps,
	wrapFieldEditorForSjsf,
} from "./wrap-field-editor";

describe("injectEditorIntoWidgetProps", () => {
	test("object spread snapshots bindable value (documents the footgun)", () => {
		let formValue = "Ada";
		const props = {
			get value() {
				return formValue;
			},
			set value(next: string) {
				formValue = next;
			},
		};

		const spread = { ...props, editor: "x" };
		spread.value = "Grace";
		expect(formValue).toBe("Ada");
	});

	test("preserves bindable setter when injecting editor", () => {
		let formValue = "Ada";
		const props: Record<string, unknown> = {
			get value() {
				return formValue;
			},
			set value(next: string) {
				formValue = next;
			},
			config: { title: "name" },
		};

		const next = injectEditorIntoWidgetProps(props, (() => {}) as never, {
			placeholder: "x",
		});

		expect(next.config).toEqual({ title: "name" });
		expect(typeof next.editor).toBe("function");
		expect(next.editorProps).toEqual({ placeholder: "x" });

		(next as { value: string }).value = "Grace";
		expect(formValue).toBe("Grace");
		expect((next as { value: string }).value).toBe("Grace");
	});
});

describe("wrapFieldEditorForSjsf", () => {
	test("returns a callable SJSF widget factory", () => {
		const Wrapped = wrapFieldEditorForSjsf((() => {}) as never, {
			editorProps: { hint: "x" },
		});
		expect(typeof Wrapped).toBe("function");
	});
});
