/**
 * Shared DTOs for write-back.
 */
import type { z } from "zod";
import type { CollectionDescriptor } from "./collection-descriptors";

/** Content entry payload — clients never send FS paths. */
export type ContentEntry = {
	id: string;
	collection: string;
	data: Record<string, unknown>;
	/** Opaque concurrency token from the write-back implementation. */
	revision: string;
};

/**
 * Guarded save input (ADR-0014).
 * `expectedRevision` is the token from the last successful read/save;
 * `null` means create-only (entry must not already exist).
 */
export type UpsertEntryInput = {
	id: string;
	collection: string;
	data: Record<string, unknown>;
	expectedRevision: string | null;
};

/** Low-level read/write within allowlisted roots (injected into write mode). */
export type Writer = {
	readText(path: string): Promise<string>;
	writeText(path: string, contents: string): Promise<void>;
	readBytes(path: string): Promise<Uint8Array>;
	writeBytes(path: string, contents: Uint8Array): Promise<void>;
	remove(path: string): Promise<void>;
	list(dir: string): Promise<string[]>;
};

/** Result of writing one original asset beside an entry (ADR-0015). */
export type WrittenImageAssets = {
	/** Path relative to the entry JSON file (Astro `image()` input), e.g. `./hello/cover/photo.jpg`. */
	path: string;
	/** Paths written, relative to content root. */
	files: string[];
};

export type WriteImageAssetsInput = {
	collection: string;
	id: string;
	/** Folder name under the entry id dir (default `cover`). */
	name?: string;
	/** Sanitized basename is applied by write-mode. */
	filename: string;
	bytes: Uint8Array;
};

export type ReadAssetResult = {
	bytes: Uint8Array;
	contentType: string;
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
	upsertEntry(input: UpsertEntryInput): Promise<ContentEntry>;
	deleteEntry(collection: string, id: string): Promise<void>;
	/**
	 * Write one original file into `{base}/{id}/{name}/` beside the entry JSON.
	 * Clears prior files in that folder, then returns the entry-relative path.
	 */
	writeImageAssets(input: WriteImageAssetsInput): Promise<WrittenImageAssets>;
	/** Read an allowlisted file under the content root (dev asset serving). */
	readAsset(relFromRoot: string): Promise<ReadAssetResult>;
};

export type CreateCmsHostOptions = {
	root: string;
	/** Absolute or root-relative path prefixes that may be written. */
	allowPaths: string[];
	writer: Writer;
	/**
	 * Collection descriptors — preferred happy path (ADR-0007 / 0019 / 0020).
	 * Path = root + collection.base + id + ext (or pathTemplate).
	 */
	collections?: CollectionDescriptor[];
	/**
	 * Optional Content Layer id index keyed by collection name.
	 * When absent, listEntries FS-scans the collection base.
	 */
	entryIndex?: Record<string, string[]>;
	/** Per-collection Zod schemas. Merged under descriptor schemas when both set. */
	schemas?: Record<string, z.ZodType>;
};

/**
 * Full WriteMode construction — includes internal test seams.
 * Hosts use {@link CreateCmsHostOptions} via createCmsHost / createCmsProtocol.
 */
export type CreateWriteModeOptions = CreateCmsHostOptions & {
	/**
	 * Internal test seam: (collection, id) → relative path overrides.
	 * Not part of the public host construction face.
	 */
	pathMap?: Record<string, Record<string, string>>;
	/**
	 * @deprecated Prefer `collections` + FS scan. Internal test seam only.
	 */
	fakeCatalog?: Record<string, ContentEntry[]>;
};
