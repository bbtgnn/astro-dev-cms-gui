# Astro Dev CMS — client-side authoring architecture

Status: design draft

Date: 2026-09-15

This document captures the architectural direction explored after the initial
authoring-shell prototype. It separates intended decisions from deferred
questions. APIs are illustrative unless explicitly described as requirements.

## 1. Product intent

Astro Dev CMS is a local-first authoring application for Astro content
collections:

- Content files in the project working tree remain the source of truth.
- Zod remains the data validation and type-inference foundation.
- A Svelte client application provides the authoring UI.
- SJSF renders schema-driven forms.
- Astro's content layer remains responsible for native image and relation
  behavior used by site templates.
- Project authors can provide direct Svelte components for custom fields.
- The real Astro page is the preferred preview surface.
- Git integration is external. The working tree represents current authoring
  state; commits represent accepted snapshots.

This is not intended to introduce a parallel hosted CMS data model or require
an always-on CMS service.

## 2. Core design principles

### 2.1 One content model, environment-specific projections

The persisted content model is shared, but the Astro site and browser editor
need different schema projections:

- The **Astro projection** uses Astro's native schema helpers and produces the
  output types consumed by templates.
- The **editor projection** models persisted input values and carries
  authoring metadata and direct Svelte components.

These projections must agree on the persisted shape. They do not need to be
the same concrete Zod instance.

### 2.2 Validation and presentation remain distinct

Zod answers:

> Is this persisted value valid?

Field metadata answers:

> Which control edits this value?

Layout metadata answers:

> Where and how are controls arranged?

The declarations may be colocated, but UI layout must not distort the
persisted data shape. For example, fields must not be nested in artificial
objects solely to create tabs.

### 2.3 Import executable UI; do not serialize it

Svelte component constructors cannot cross an Astro island prop boundary.
Direct-component DX is preserved by importing project configuration through
the browser module graph.

The integration must not execute the project configuration and serialize its
result. It must expose a static import or re-export so Vite can compile,
bundle, split, and hot-reload the referenced Svelte components.

### 2.4 Edit Zod input; render Astro output

The editor owns persisted input values. Astro may transform those values for
site consumption:

```text
Persisted input              Astro output
──────────────────────────────────────────────────────────────
"./cover.webp"      ->       ImageMetadata
"ada"               ->       { collection: "authors", id: "ada" }
```

Forms and write-back operate on the left side. Site templates operate on the
right side.

## 3. High-level architecture

```text
Astro route
  /cms
    |
    `-- CmsApp client:only="svelte"
          |
          | imports virtual:@cms/config
          |   - editor Zod schemas
          |   - FieldUi and layouts
          |   - direct Svelte field components
          |
          | uses SJSF for forms
          |
          `-- calls /_cms API
                - list collections and entries
                - read entry input
                - validate writes authoritatively
                - atomically write files
                - upload/process assets

Astro site routes
  - load native content collections
  - receive Astro schema output
  - render production block components
  - provide the real preview page
```

The CMS UI is a client-side Svelte application. The filesystem and trusted
validation remain server-side capabilities.

### 3.1 Astro mount point

The `/cms` Astro page should become a thin mount point. It should not discover
live schemas, convert them server-side, or pass schema maps as island props.

Only small serializable runtime values, such as an API base URL or initial
route, may cross that boundary.

### 3.2 Project configuration import

The Astro integration should accept a browser-safe CMS configuration module:

```ts
cms({
  config: "./src/cms.config.ts",
});
```

It should expose that file through a Vite virtual module:

```ts
// Conceptual generated module; do not JSON.stringify the config.
export { default } from "/absolute/project/path/src/cms.config.ts";
```

The Svelte application imports `virtual:@cms/config`. This makes all direct
component references part of the normal client module graph and preserves
Vite HMR.

An initial implementation may use a project-authored Svelte wrapper that
imports the configuration directly. The virtual module is the productized
form that removes that wrapper.

### 3.3 Browser-safe boundary

The client configuration must not import:

- `astro:content`
- `astro/loaders`
- Node filesystem modules
- server secrets
- write-mode implementations

The existing `content.config.ts` is therefore not a valid client entrypoint.
Shared definitions must live in runtime-neutral modules.

### 3.4 Server configuration and validation

The browser CMS configuration is not the server's configuration source.
`@cms/routes` still needs a server-only registry derived from
`content.config.ts` or an equivalent generated manifest. That registry owns:

- collection names and loader/path mappings
- allowlisted content roots
- input validators
- serialization settings
- Astro schema projections

The integration therefore has two module-graph edges:

```text
virtual:@cms/config          -> browser-safe cms.config.ts
server collection registry  -> content.config.ts / server manifest
```

The server must validate persisted input asynchronously, because a Zod schema
may contain async refinements. Validation must not cause transformed Astro
output to be written to disk. If the native Astro schema is used for this
validation, the server must discard its parsed output and serialize the
accepted input. Prefer a dedicated persisted-input validator generated from
the shared semantic model.

## 4. Schema architecture

### 4.1 Semantic field declaration

A future API may use a schema factory or semantic definition that can produce
both projections:

```ts
const posts = defineContentSchema(({ object, text, image, reference }) =>
  object({
    title: text(),
    cover: image(),
    author: reference("authors"),
  }),
);
```

The exact builder API is unresolved. The required property is that `image`
and `reference` retain semantic identity instead of being reduced too early
to generic strings.

### 4.2 Astro projection

The server/build projection uses Astro's own Zod and helpers:

```ts
schema: ({ image }) =>
  posts.forAstro({
    image,
    reference: astroReference,
  });
```

The projection must:

- Use `astro/zod` for the concrete Astro schema.
- Use `SchemaContext["image"]` for local image fields.
- Use `typeof astroReference` for relations.
- Preserve literal collection names.
- Preserve each field's input and output types without claiming that they are
  equal.
- Return the exact inferred schema type.

It must not return a broad `ZodType`, `ZodTypeAny`, or `unknown`.

### 4.3 Editor projection

The client projection uses browser-compatible Zod and authoring metadata:

```ts
posts.forEditor({
  components: {
    cover: ImageEditor,
    author: RelationEditor,
  },
});
```

For the editor:

- An image is represented by its persisted path or upload value.
- A relation is represented by its persisted target entry ID.
- UI metadata selects image and relation controls.
- Direct Svelte component references remain live values.

The runtime-neutral semantic model should also produce a component-free
persisted-input validator for authoritative server writes. The editor schema
may add UI metadata and components to this same input shape.

### 4.4 Collection type inference

Astro collection types must continue to be inferred from the exact schema
returned by `defineCollection()`:

```ts
type Post = CollectionEntry<"posts">;
```

Expected Astro output includes:

- `post.data.cover` as `ImageMetadata` for a native image field.
- `post.data.author` as the native Astro reference value.
- Typed `getEntry(post.data.author)` resolution.

Type preservation is an acceptance criterion for the schema compiler.
Compile-time tests must assert:

- The persisted-input validator's value type equals
  `z.input<typeof astroSchema>`.
- The editor's persisted value type equals that same input type.
- `z.output<typeof astroSchema>` retains Astro's native transformed image and
  reference types.

The prototype's current bridge erases this information by returning
`AstroZod.ZodTypeAny`. That bridge must not be part of the target design.

### 4.5 Native Astro image and relation behavior

The CMS must not attempt to run Astro's image or relation helpers in the
browser. Instead:

1. The editor creates and validates persisted input.
2. The server validates that input authoritatively.
3. Astro's content schema transforms it when loading site content.
4. Site templates receive native Astro output.

Uploads must produce a canonical path accepted by Astro's image schema.
Relations must persist target IDs, not Astro's transformed reference objects.

## 5. Field components and SJSF

### 5.1 Extension levels

The system should distinguish these SJSF extension levels:

- **Widget:** the concrete input control for a scalar value.
- **Field:** schema orchestration around a value, including nested fields.
- **Template:** layout and presentation around fields.

Examples:

- An image picker usually replaces `textWidget`.
- A locale-aware object editor replaces `objectField`.
- A blocks editor replaces `arrayField`.
- Tabs and grids belong in an object template or equivalent layout renderer.

### 5.2 Native SJSF component extension

SJSF already allows:

- A direct component in `ui:components`.
- A named component registered in a theme.
- A registered string key selected by `ui:components`.

For a registered custom widget, the pattern is:

```ts
declare module "@sjsf/form" {
  interface ComponentProps {
    cmsColorPicker: ComponentProps["textWidget"];
  }

  interface ComponentBindings {
    cmsColorPicker: "value";
  }
}

const theme = extendByRecord(baseTheme, {
  cmsColorPicker: ColorPicker,
});
```

The UI schema selects it as:

```ts
{
  "ui:components": {
    textWidget: "cmsColorPicker"
  }
}
```

The left side is the SJSF slot being replaced. The right side is the
replacement component.

`extendByRecord()` adds fallback names; it does not replace an existing theme
key. `overrideByRecord()` is required to replace an existing key directly.

### 5.3 Direct component DX

Project authors should also be able to use a direct Svelte component:

```ts
field(z.string(), ColorPicker);
```

This is feasible when the editor schema and component enter through
`virtual:@cms/config`. It is not feasible when the component is passed as a
prop from `.astro` to a hydrated/client-only island.

Named registry components remain useful for package-provided fields and
reusable defaults. Direct components are the project-author escape hatch.

Every direct component binding must ultimately identify the SJSF slot it
replaces. Semantic builders may provide an unambiguous default:

- scalar text-like field -> `textWidget`
- object field -> `objectField`
- array field -> `arrayField`

The generic escape hatch must support an explicit target:

```ts
field(schema, {
  component: CustomEditor,
  target: "objectField",
});
```

`field(schema, Component)` is sugar only when the target can be inferred
without ambiguity. An unknown schema must not silently fall back to
`textWidget`.

### 5.4 Component compatibility

Custom SJSF fields and widgets must accept the props supplied by the slot they
replace and must support its required bindings. Value-owning fields and
widgets bind `value`; templates generally do not.

The package should preserve SJSF's compile-time compatibility checks where
possible. The prototype's local `UiSchemaNode["ui:components"]` type uses
`Record<string, unknown>`, which bypasses these checks at the form boundary.

### 5.5 One form instance

Tabs, groups, and blocks must remain inside one SJSF form instance. Creating
one form per tab would fragment:

- form state
- validation
- field IDs
- error navigation
- submission

Custom layout templates should place child fields that SJSF already created;
they should not independently recreate controls.

## 6. Form layout model

### 6.1 Layout is a recursive container tree

Tabs and columns should share one recursive layout mechanism. The common
concept is a `group` or `container`, not a column.

The recursive field/group tree, object-local attachment, automatic fallback,
and a single SJSF form are accepted requirements. Exact function names and
the final TypeScript representation remain open. Illustrative model:

```ts
type LayoutNode =
  | { type: "field"; path: string; span?: number }
  | {
      type: "group";
      id?: string;
      label?: string;
      presentation?: "stack" | "grid" | "tabs" | "accordion";
      columns?: number;
      children: LayoutNode[];
    };
```

Example:

```ts
group({
  presentation: "tabs",
  children: [
    group({
      id: "content",
      label: "Content",
      children: [
        group({
          presentation: "grid",
          columns: 12,
          children: [
            field("title", { span: 8 }),
            field("draft", { span: 4 }),
          ],
        }),
        field("body"),
      ],
    }),
    group({
      id: "media",
      label: "Media",
      children: [field("cover")],
    }),
  ],
});
```

### 6.2 Layout locality

A layout attached to an object should normally reference that object's direct
properties. Nested objects own nested layouts.

Arbitrary cross-object paths are deferred because they complicate error
ownership, array indices, unions, and SJSF's schema-path resolution.

### 6.3 SJSF lowering

The layout compiler should:

1. Generate the ordinary field-oriented SJSF UI schema.
2. Validate layout field references.
3. Derive SJSF `ui:options.order`.
4. Use theme layout options for simple grids where sufficient.
5. Select a CMS object template for tabs and richer recursive composition.
6. Fall back to a vertical stack for fields not explicitly arranged.

Tabs require renderer-owned active state, keyboard behavior, ARIA
relationships, error badges, and navigation to the first invalid tab. These
are presentation concerns, not persisted schema concerns.

The layout descriptor must remain serializable even though field components
need not be serializable.

## 7. Blocks

### 7.1 Persisted shape

A blocks field is an ordered discriminated collection:

```ts
type BlockItem<TType extends string, TContent> = {
  type: TType;
  content: TContent;
};
```

The schema is an array whose item is a discriminated union over registered
block types.

### 7.2 Editor behavior

The blocks field should:

- List available block types.
- Add a block with empty/default content.
- Select the matching discriminated-union branch.
- Delegate `content` to SJSF as a nested form.
- Preserve field-level custom components inside block schemas.
- Reorder, duplicate, and remove blocks according to configured capabilities.
- Display validation errors at the relevant block.

The existing `BlocksLayoutField.svelte` already follows the core approach:
it chooses the matching union branch and asks SJSF to render the nested
`content` field.

When adding a block, its initial content should be derived from schema
defaults where available rather than always using `{}`. Duplication must
respect SJSF's configured copy capability.

### 7.3 Separate schema and production rendering

Block schema definitions must be safe to import from `content.config.ts`.
Production component bindings must remain outside that module.

Illustrative organization:

```text
src/blocks/
  hero/
    schema.ts
    Render.svelte
    Render.astro       # optional Astro adapter
  cta/
    schema.ts
    Render.svelte
  schemas.ts
  renderers.ts
```

Schema registry:

```ts
const postBlockSchemas = defineBlockSchemas({
  hero: { label: "Hero", schema: heroSchema },
  cta: { label: "CTA", schema: ctaSchema },
});
```

Site binding:

```ts
const postBlockRenderers = bindBlockComponents(postBlockSchemas, {
  hero: Hero,
  cta: Cta,
});
```

`bindBlockComponents()` should enforce that renderer keys match schema keys.

This formalizes the split already present between `post-blocks.ts` and
`post-blocks-render.ts`.

### 7.4 Preview decision

The CMS does not require inline block preview components by default. Editors
should see the real Astro preview page.

Consequences:

- There is no second preview-component registry to maintain.
- Astro-only block components remain supported.
- Native Astro image and reference output is exercised.
- Site CSS, layouts, routing, and integrations are represented faithfully.
- Block render logic is not duplicated in the CMS client.

A browser-safe Svelte renderer may still be shared between the Astro site and
the CMS in a future inline-preview mode, but this is optional rather than a
block contract requirement.

## 8. Page preview

### 8.1 Initial preview mode: persisted content

The simplest and preferred initial flow is:

```text
Edit form
  -> validate
  -> atomically persist canonical content
  -> Astro content refresh/HMR
  -> reload or refresh real preview page
```

Each editable collection needs a way to derive its preview URL:

```ts
preview: ({ id }) => `/posts/${id}`;
```

The preview may appear in an iframe, split pane, or adjacent browser tab. The
rendered page is the actual site route.

### 8.2 Unsaved draft preview

Previewing invalid or unpersisted form state through a real Astro page is a
separate feature. It would require:

1. A draft store keyed by a scoped preview token.
2. A client API to update draft values.
3. A preview route capable of loading the draft instead of canonical content.
4. A shared page renderer or project-provided draft renderer.
5. Reload, polling, SSE, or another refresh notification mechanism.

An arbitrary existing Astro page cannot automatically receive unsaved draft
data when it calls `getEntry()` internally. This mode is deferred.

`postMessage` alone does not solve server rendering of Astro-only components;
the iframe still needs a server request or a separate client renderer.

## 9. Persistence and Git

### 9.1 Working tree as draft

For the local-first CMS, valid changes should be autosaved to canonical
content files. The Git working tree acts as the current draft:

```text
Browser form state
  -> debounced valid write
  -> working tree
  -> Astro preview
  -> external Git integration
  -> commit
```

Semantics:

- `HEAD` is the last accepted snapshot.
- Modified files are current authoring work.
- A commit records an accepted snapshot.
- Push or deployment may provide a later publication gate.

A commit is only a publication gate when production reads committed or pushed
content. The local Astro preview intentionally reads working-tree changes.

### 9.2 Autosave rules

The implementation should not write on every keystroke. It should:

1. Update browser form state immediately.
2. Validate client-side for responsive feedback.
3. Debounce and coalesce writes.
4. Validate authoritatively on the server.
5. Write a complete file atomically.
6. Report `invalid`, `saving`, and `saved to disk` separately.

Invalid documents should not replace canonical content because they may break
Astro's content loader and the preview page. Invalid in-progress form state
may be retained in browser storage as a recovery aid.

An external Git adapter may additionally report `uncommitted`, commit, and
push state. The core autosave implementation must not read `HEAD` merely to
produce persistence status.

### 9.3 Concurrency and external edits

Writes should carry a revision, content hash, or equivalent `ifMatch` value.
The API should reject stale writes rather than silently overwriting:

- changes from another browser tab
- manual file edits
- formatter or generator output
- external Git operations

Atomic temp-file replacement prevents Astro from observing partially written
YAML.

### 9.4 Images

An image write is a compound operation:

1. Upload or generate the canonical image asset.
2. Confirm the asset path is valid and allowlisted.
3. Persist the content field referencing that path.
4. Clean up abandoned assets when practical.

The content file must not point at an asset that failed to write.

### 9.5 Copy-based drafts

Separate draft copies are deferred. They become appropriate for:

- multiple editorial versions
- approval workflows
- concurrent remote editors
- keeping canonical content unchanged until explicit promotion
- hosted CMS operation

They also introduce synchronization, promotion, path identity, image-relative
path, and relation-resolution complexity. The persistence layer should leave
room for a future draft adapter without making copies the default model.

## 10. Server API responsibilities

Even with a fully client-side CMS UI, the server API remains authoritative.
It owns:

- collection and entry discovery
- allowlisted filesystem paths
- read, create, update, and delete operations
- authoritative input validation
- atomic serialization and writes
- image upload and processing
- conflict detection
- optional preview draft storage
- authentication and authorization if production access is enabled

Client validation is a UX feature, not a trust boundary.

The API must never accept raw filesystem paths from the browser. Collection
and entry IDs must be resolved server-side beneath configured roots.

The intended dev-only default remains appropriate. If production authoring is
enabled later, authentication, authorization, CSRF/origin protection, audit
requirements, and deployment topology become mandatory design work.

## 11. Proposed module boundaries

```text
Project
  src/content-model/
    posts.ts              shared semantic/input model
    post-blocks.ts        framework-neutral block schemas

  src/content.config.ts   Astro loaders and Astro schema projection

  src/cms.config.ts       browser-safe editor projection
                          direct Svelte field components
                          layouts and preview URL functions

  src/blocks/
    Hero.svelte           production Svelte renderer, if used
    Hero.astro            optional Astro-only renderer/adapter

Packages
  @cms/fields              schema semantics, metadata, layout types
  @cms/form                SJSF bridge, fields, widgets, templates
  @cms/crud                DTOs, client, persistence abstractions
  @cms/routes              Astro integration, virtual config module, API
  @cms/components          shared CMS chrome
```

`@cms/fields` should remain Svelte-free. Svelte component values may be typed
loosely there and narrowed at the `@cms/form` boundary, or component bindings
may live exclusively in the Svelte-facing editor projection.

## 12. Current prototype gaps

The prototype proves useful mechanics but differs from this target:

1. `cms.astro` converts schemas server-side and serializes them into the
   client-only shell.
2. Direct Svelte component references are therefore lost at the island
   boundary.
3. `CmsForm` imports a closed theme.
4. The collection schema bridge returns `AstroZod.ZodTypeAny`, erasing Astro
   collection inference.
5. The current CMS `image()` is a string schema rather than Astro's native
   schema-context image helper.
6. `adaptReference()` falls back to a portable string when native Astro
   reference metadata cannot be attached, losing the native transform.
7. `UiSchemaNode["ui:components"]` is too loose to retain SJSF compatibility
   checks.
8. Form submission is explicit rather than debounced working-tree autosave.
9. The site block schema and renderer split exists, but it is not yet a
   formal typed registry contract.
10. The preview is currently a standalone demonstration rather than a
    collection-configured real-page preview.
11. There is no layout descriptor, compiler, or custom object template yet.
12. The sample middleware currently hardcodes `isDev: true`; this bypasses
    environment-derived dev guarding and must not be treated as the target
    security posture.
13. The blocks editor initializes all new block content as `{}` instead of
    applying schema defaults.
14. The blocks editor does not yet expose duplication when SJSF marks an
    array copyable.
15. Server-side collection configuration and persisted-input validation are
    still coupled to prototype discovery and synchronous `safeParse()`.

These are migration targets, not reasons to discard the existing field,
form, CRUD, or route work.

## 13. Suggested implementation sequence

### Phase A — client application boundary

- Reduce `/cms` to a client-only Svelte mount.
- Add a project CMS configuration path to the Astro integration.
- Expose it as a static Vite virtual-module re-export.
- Import editor schemas in the client rather than passing them through props.
- Preserve the existing API for entry data and mutations.

### Phase B — direct component path

- Allow live Svelte components in editor field metadata.
- Feed direct components into SJSF `ui:components`.
- Expose an extensible CMS theme for named package and project components.
- Tighten the form boundary to SJSF's actual UI-schema component types.

### Phase C — schema projections

- Define the semantic schema/factory contract.
- Implement an Astro projection using native image and reference helpers.
- Implement a component-free persisted-input validator.
- Implement an editor projection over that input shape.
- Add compile-time tests for input-type equality and `CollectionEntry`
  inference.
- Add runtime parity tests proving the persisted-input and Astro projections
  accept the same persisted values.
- Change authoritative write validation to the async Zod parse path.

### Phase D — layout

- Define the recursive layout model.
- Validate field references.
- Lower order and simple grids into SJSF UI options.
- Add the custom object template for tabs and richer groups.
- Add accessibility and error-navigation tests.

### Phase E — blocks and real-page preview

- Formalize typed block schema and renderer registries.
- Keep nested SJSF editing in the blocks array field.
- Add collection preview URL configuration.
- Show or open the real Astro route after valid writes.

### Phase F — autosave and conflict safety

- Add debounced, coalesced autosave.
- Add atomic writes.
- Add revision/hash conflict detection.
- Add explicit persistence status.
- Add browser recovery for invalid in-progress state.

## 14. Acceptance criteria

The target architecture is successful when:

- `/cms` runs as a client-only Svelte authoring application.
- The CMS configuration is imported through Vite rather than serialized.
- A project author can pass a direct Svelte component to a field.
- That custom field participates in the same SJSF form state and validation.
- Tabs and grids arrange fields without changing persisted data shape.
- Native Astro image and reference output remains available in site
  templates.
- Editor and server persisted values equal the Astro schema's input type.
- `CollectionEntry<"collection">` retains precise inferred types.
- A blocks field generates branch-specific nested forms.
- Production blocks render only through the site's renderer registry.
- The actual Astro page acts as the default preview.
- Valid changes are atomically autosaved to the working tree.
- Invalid changes do not break the Astro content loader.
- Stale writes are detected.
- Server validation and path allowlisting remain authoritative.

## 15. Deferred decisions

The following remain intentionally open:

- Exact public syntax for semantic schemas and dual projections.
- Exact server registry/manifest API and how it is derived from
  `content.config.ts`.
- Whether direct component metadata uses Zod global metadata, a custom Zod
  registry, or an editor-side descriptor.
- How generic direct-component bindings declare their SJSF replacement slot.
- Whether layout references are limited permanently to direct object
  properties or later gain typed deep paths.
- Whether custom field authors target raw SJSF contracts or a smaller stable
  CMS adapter contract.
- How to lazy-load components per collection or field.
- Whether invalid browser state uses `localStorage`, IndexedDB, or no recovery.
- Exact preview placement: split pane, iframe, or adjacent tab.
- Unsaved server-rendered draft preview transport.
- Production authentication and multi-user persistence.
- Copy-based drafts and approval workflows.
- Git UI and commit/push integration, which are external to this scope.

## 16. Reference APIs

- Astro content collections:
  <https://docs.astro.build/en/guides/content-collections/>
- Astro content API (`reference()`, `SchemaContext.image`):
  <https://docs.astro.build/en/reference/modules/astro-content/>
- Astro integration API:
  <https://docs.astro.build/en/reference/integrations-reference/>
- SJSF custom components:
  <https://x0k.github.io/svelte-jsonschema-form/guides/custom-components/>
- SJSF UI schema:
  <https://x0k.github.io/svelte-jsonschema-form/form/ui-schema/>
- Vite plugin and virtual-module conventions:
  <https://vite.dev/guide/api-plugin>
