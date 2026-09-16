---
status: accepted
---

# The working tree is the local draft

For the local filesystem implementation, valid authoring changes write back to canonical project content. The Git working tree represents current authoring work; a commit represents an accepted snapshot. Git status, commit, push, and publication remain outside the CMS protocol.

The authoring UI updates immediately, validates for responsive feedback, and coalesces writes. The write-back implementation then validates authoritatively and replaces the complete canonical file atomically.

Invalid browser state must not replace canonical content because it can break Astro content loading and the real-page preview. Browser recovery for invalid in-progress state is optional and its storage mechanism remains open.

Writes carry an opaque revision or equivalent precondition. Stale writes fail with a conflict instead of overwriting changes from another tab, manual edits, formatters, generators, or external Git operations.

Copy-based drafts, approval workflows, and concurrent remote editorial versions are separate future product modes, not the default local-first model.
