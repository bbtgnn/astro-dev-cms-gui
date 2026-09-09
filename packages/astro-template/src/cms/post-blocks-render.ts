/**
 * Host render map for posts blocks — schemas + Astro components for resolveBlock.
 * Do not import this from content.config (Astro components break the content layer).
 */
import type { BlockDefinition } from "@cms/routes";
import Cta from "../components/blocks/Cta.astro";
import Hero from "../components/blocks/Hero.astro";
import { postBlockSchemas } from "./post-blocks";

export const postBlocks = {
	hero: { ...postBlockSchemas.hero, component: Hero },
	cta: { ...postBlockSchemas.cta, component: Cta },
} as const satisfies Record<string, BlockDefinition>;
