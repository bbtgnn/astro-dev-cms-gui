---
status: accepted
---

# The real Astro page is the default preview

The initial preview mode shows persisted valid content through the project's real Astro route:

1. The editor validates a change.
2. Write-back atomically updates canonical content.
3. Astro refreshes or reloads the site route.
4. The editor sees the result through the site's actual renderer, styles, routes, and integrations.

Each editable collection supplies a way to derive a preview URL from a content entry identity.

This preserves Astro-only renderers and native image/reference output without requiring the authoring UI to duplicate production rendering.

Preview placement (split pane, iframe, or adjacent tab) remains open. Previewing invalid or unpersisted browser state is a separate future capability requiring explicit draft transport; `postMessage` alone cannot inject that state into server-rendered Astro pages.
