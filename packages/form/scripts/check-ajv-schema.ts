/**
 * Guard: Zod→JSON Schema after stripUiFromJsonSchema must validate under
 * @sjsf/ajv8-validator (regression: draft/2020-12 $schema threw and blocked Submit).
 */

import {
	boolean,
	config,
	markdown,
	object,
	reference,
	stripUiFromJsonSchema,
	text,
	toFormSchemas,
} from "@cms/fields";
import { createFormValidator } from "@sjsf/ajv8-validator";

const posts = object(
	{
		title: text({ label: "Title" }),
		draft: boolean({ label: "Draft", default: false }),
		body: markdown({ label: "Body" }),
		author: reference("authors", { label: "Author" }),
	},
	{ label: "Posts" },
).meta(config({ label: "Posts", base: "posts" }));

const { schema } = toFormSchemas(posts);
const stripped = stripUiFromJsonSchema(schema);

if (stripped.$schema !== undefined) {
	throw new Error(`expected $schema removed, got ${String(stripped.$schema)}`);
}
if ("ui" in stripped || "config" in stripped) {
	throw new Error("expected root ui/config removed");
}

const props = stripped.properties as Record<string, Record<string, unknown>>;
for (const [key, node] of Object.entries(props)) {
	if ("ui" in node) throw new Error(`expected ${key}.ui removed`);
}

const validator = createFormValidator();
const value = {
	title: "Hello tracer",
	draft: true,
	body: "Pass 1 fake entry.",
	author: "ada",
};

const ok = validator.isValid(stripped as never, stripped as never, value);
if (!ok) {
	throw new Error("expected Ajv isValid(true) for sample posts value");
}

const bad = validator.isValid(stripped as never, stripped as never, {
	title: 123,
	draft: true,
	body: "x",
	author: "ada",
});
if (bad) {
	throw new Error("expected Ajv isValid(false) for invalid title type");
}

console.log("ok  stripUiFromJsonSchema is Ajv-safe");
