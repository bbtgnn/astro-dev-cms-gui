---
status: accepted
---

# Editor configuration is IR form model only

The authoring shell accepts only the IR editor projection (JSON Schema +
uiSchema/layout). There is no transitional Zod / FieldUi-on-`.meta()` editor
path, no `toFormSchemas(Zod)` seam, and no package default host that discovers
editable schemas from live `content.config`.

`cms()` editing requires editor configuration (`src/cms.config.ts` by
convention). The package default `CmsHost` is the built-in FS adapter behind
the CMS protocol. Custom adapters use `createCmsMiddleware` / a project
`createHost`, or `cmsHarness` from `@cms/astro/testing` — not a second option
on `cms()`. Generated `content.config.ts` remains Astro’s collection graph and
type surface — not a second editor-configuration authority.

Blocks, i18n, and similar capabilities return as IR kinds + FieldEditorProps /
catalog bindings ([#29](https://github.com/bbtgnn/astro-dev-cms-gui/issues/29)),
not by restoring Zod FieldUi.

Why delete rather than keep an adapter: a dual seam kept two validation engines
and invited rediscovery of ADR-0003. Capability gaps are honest open work, not a
reason to keep a second schema language.

Extends [ADR-0019](0019-cms-first-semantic-schema.md). Amends
[ADR-0004](0004-live-content-config-discovery.md) and
[ADR-0016](0016-astro-convention-install-surface.md) install/host wording.
