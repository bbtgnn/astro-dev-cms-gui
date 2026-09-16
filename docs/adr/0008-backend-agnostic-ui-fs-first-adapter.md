---
status: accepted
---

# Backend-agnostic authoring UI; filesystem is the first adapter

The portable claim is a **backend-agnostic authoring UI** whose editor configuration (schemas, layouts, direct Svelte components, field extensions) is compiled by the host Vite/Astro project — not delivered by a remote backend. The backend transports only serializable data.

Conceptual layers:

1. **Authoring UI** — Svelte/SJSF forms, themes, layouts, editor shell, browser validation, autosave orchestration. No Astro, Node, FS paths, serializers, Sharp, or Git.
2. **CMS protocol / domain** — serializable DTOs and ops (list, read, save, assets, capabilities, validation errors). Entry identities, not filesystem paths.
3. **Host / backend adapters** — Astro mounts the UI and endpoints and exposes `virtual:@cms/config`; the FS adapter does discovery, authoritative validation, serialization, atomic writes, revisions, and image processing. A remote backend may implement the same protocol later.

Reject hosted git CMS (remote git auth + someone else's admin control plane) as the product. Do not reject “a remote protocol backend” in principle. Do not create packages solely for hypothetical reuse before the seams are stable.
