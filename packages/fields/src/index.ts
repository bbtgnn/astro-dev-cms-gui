/**
 * PROTOTYPE / SPIKE — @cms/fields
 * Pass 0: empty sockets. Pass 3 fills a hardcoded Zod → JSON Schema helper.
 */
import { z } from "zod";

/** Placeholder FieldUi registry — not a real discovery model. */
export const fieldUiRegistry = {
  /* pass 0 stub */
} as const;

/**
 * Hardcoded posts schema for the form tracer (Pass 3).
 * Not content.config discovery.
 */
export const prototypePostsSchema = z.object({
  title: z.string().meta({ title: "Title" }),
  draft: z.boolean().default(false).meta({ title: "Draft" }),
  body: z.string().meta({ title: "Body" }),
});

export type PrototypePostsInput = z.input<typeof prototypePostsSchema>;

/** Zod → JSON Schema using Zod 4 (input shape). */
export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema, {
    io: "input",
    unrepresentable: "any",
  }) as Record<string, unknown>;
}

export { z };
