/**
 * Persisted-input shape for the authors sample collection.
 * Shared parity target for the browser editor projection and the Astro /
 * authoritative server projection — no FieldUi or Svelte bindings here.
 */
import { z } from "zod";

export const authorsPersistedSchema = z.object({
	name: z.string(),
});

export type AuthorsPersistedInput = z.input<typeof authorsPersistedSchema>;
