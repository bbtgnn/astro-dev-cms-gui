import type { BlockDefinition } from "./types";

/** Persisted / form value for one blocksLayout entry. */
export type BlocksLayoutItem = {
	type: string;
	content: unknown;
};

/** Result of resolving a block against the host `blocks` map. */
export type ResolvedBlock = {
	component: unknown;
	props: unknown;
};

/**
 * Map a stored `{ type, content }` item to `{ component, props: content }`.
 * Hosts pass the same `blocks` map used in `blocksLayout({ blocks })`.
 * Returns undefined when `type` is missing from the map.
 */
export function resolveBlock(
	block: BlocksLayoutItem | null | undefined,
	blocks: Record<string, BlockDefinition>,
): ResolvedBlock | undefined {
	if (block == null || typeof block.type !== "string") return undefined;
	const def = blocks[block.type];
	if (!def) return undefined;
	return { component: def.component, props: block.content };
}
