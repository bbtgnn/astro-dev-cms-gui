# Prior art for git-backed schema-driven CMS

Type: research
Status: resolved

## Question

What should a buildable spec borrow or explicitly reject from Pages CMS, Keystatic, Decap, Tina, and Kirby (fields / locale alternatives / blocks)—focused on **repo-local editing**, schema→UI generation, and **dev-only** or git-backed flows? Produce a short comparison with primary-source citations and a “take / leave” list for this authoring shell.

## Answer

Borrow **Keystatic/Tina-style local filesystem write-back**, a **field-type registry** (Decap/Pages/Tina), and **Pages-like custom field packages** (schema + editor + read/write)—mapped to Svelte/`@cms/*`. Treat Kirby **fieldsets** and **`translate: false`**, plus Decap i18n layouts, as vocabulary for open `blocksLayout` / `i18n` threads only. Explicitly reject hosted GitHub-App/OAuth write paths, always-on CMS servers, Tina GraphQL-as-requirement, and parallel forever-YAML schemas as the v1 core route.

Full comparison + take/leave: [research/02-prior-art-git-schema-cms.md](../research/02-prior-art-git-schema-cms.md)

## Comments

Scoped to repo-local / schema→UI / dev-or-git-backed; did not expand offline sync or non-dev auth. Custom i18n/image/blocksLayout left as open-thread references only.
