/**
 * PROTOTYPE / SPIKE — shared DTOs for write-back.
 */
import type { z } from "zod";

/** Content entry payload — clients never send FS paths. */
export type ContentEntry = {
	id: string;
	collection: string;
	data: Record<string, unknown>;
};

/** Low-level read/write within allowlisted roots (injected into write mode). */
export type Writer = {
	readText(path: string): Promise<string>;
	writeText(path: string, contents: string): Promise<void>;
	remove(path: string): Promise<void>;
	list(dir: string): Promise<string[]>;
};

export type WriteMode = {
	listCollections(): Promise<{ name: string }[]>;
	listEntries(collection: string): Promise<{ id: string }[]>;
	getEntry(collection: string, id: string): Promise<ContentEntry | null>;
	upsertEntry(entry: ContentEntry): Promise<ContentEntry>;
	deleteEntry(collection: string, id: string): Promise<void>;
};

export type CreateWriteModeOptions = {
	root: string;
	/** Absolute or root-relative path prefixes that may be written. */
	allowPaths: string[];
	writer: Writer;
	/**
	 * Fake (collection, id) → relative path map for the tracer.
	 * Real discovery is out of scope (tickets 07/08).
	 */
	pathMap?: Record<string, Record<string, string>>;
	/** Per-collection Zod schemas (input). Missing → z.record pass-through for spike. */
	schemas?: Record<string, z.ZodType>;
	/** In-memory fake catalog for list/get before real FS discovery. */
	fakeCatalog?: Record<string, ContentEntry[]>;
};
