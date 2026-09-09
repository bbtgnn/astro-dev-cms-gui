/**
 * PROTOTYPE / SPIKE — shared DTOs for write-back.
 */
import type { z } from "zod";
import type { DiscoveredCollection } from "./discovery";

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

export type CollectionSummary = {
	name: string;
	label?: string;
	loaderHint?: string;
};

export type WriteMode = {
	listCollections(): Promise<CollectionSummary[]>;
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
	 * P2 discovery result — preferred over fakeCatalog / pathMap for happy path.
	 * Path = root + collection.base + id + ext (or pathTemplate).
	 */
	collections?: DiscoveredCollection[];
	/**
	 * Optional Content Layer id index keyed by collection name.
	 * When absent, listEntries FS-scans the collection base.
	 */
	entryIndex?: Record<string, string[]>;
	/**
	 * Optional (collection, id) → relative path overrides (tests / Track D).
	 * Happy path should not need this once discovery is wired.
	 */
	pathMap?: Record<string, Record<string, string>>;
	/** Per-collection Zod schemas. Merged under discovery schemas when both set. */
	schemas?: Record<string, z.ZodType>;
	/**
	 * @deprecated Prefer `collections` + FS scan. Kept for tracer tests without discovery.
	 */
	fakeCatalog?: Record<string, ContentEntry[]>;
};
