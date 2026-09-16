---
status: superseded by ADR-0008
---

# Local FS authoring, not hosted git CMS

**Superseded.** The original decision rejected remote write paths as part of the v1 product route. The current direction still rejects *hosted git CMS as the product* (Decap/Pages-style control plane), but treats the filesystem as the **first backend adapter** behind a backend-agnostic authoring UI — a remote protocol backend is allowed later.

See [ADR-0008](0008-backend-agnostic-ui-fs-first-adapter.md).
