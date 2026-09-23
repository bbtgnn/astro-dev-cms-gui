/**
 * Svelte-free cms.config-shaped partition fixture for generate / load tests.
 * Lives inside the package so `@cms/core/semantic` resolves.
 */
import { s } from "@cms/core/semantic";

export const collections = {
	posts: s.collection({
		loader: s.glob({
			base: "./src/content/posts",
			pattern: "**/*.json",
		}),
		schema: s.stack([
			s.field({ id: "title", schema: s.string().min(1) }),
			s.field({ id: "cover", schema: s.image().optional() }),
			s.field({ id: "author", schema: s.reference("authors") }),
		]),
	}),
	authors: s.collection({
		loader: s.glob({
			base: "./src/content/authors",
			pattern: "**/*.json",
		}),
		schema: s.field({ id: "name", schema: s.string().min(1) }),
	}),
};
