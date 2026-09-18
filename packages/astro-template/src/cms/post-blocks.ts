/**
 * Posts `blocksLayout` schemas (content.config-safe — no .astro imports).
 * Pair with `post-blocks-render.ts` for site `resolveBlock` components.
 *
 * Import builders from `@cms/core` (not `@cms/astro`) so browser editor
 * config can reuse this module without pulling Node FS / crypto.
 */
import {
	type BlockDefinition,
	blocksLayout,
	markdown,
	object,
	text,
} from "@cms/core";

export const postBlockSchemas = {
	hero: {
		label: "Hero",
		schema: object({
			title: text({ label: "Title" }),
			body: markdown({ label: "Body" }),
		}),
	},
	cta: {
		label: "CTA",
		schema: object({
			label: text({ label: "Label" }),
			href: text({ label: "Href" }),
		}),
	},
} as const satisfies Record<string, BlockDefinition>;

export const postsBlocksField = blocksLayout({
	label: "Blocks",
	blocks: postBlockSchemas,
});
