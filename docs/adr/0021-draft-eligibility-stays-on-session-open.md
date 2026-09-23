---
status: accepted
---

# Draft-write eligibility stays on session open

The default draft-write gate (Ajv over the lowered editor schema) is built when
opening an Authoring session — not carried on `EditorCollectionInput` or
produced by form-model lowering / `editorCollectionsFromTree`.

`EditorCollectionInput` remains Ajv-safe JSON Schema + optional uiSchema for
the form shell. `openAuthoringSession` wires `createDraftEligibility` from that
schema. The form shell keeps SJSF’s own validator; the session keeps an opaque
predicate. Those are two uses of Ajv, not one shared handle to unify.

Rejected: attaching `isClientValid` to every collection input at mount time.
That widens the form-mount face with write-back policy, couples lowering to
ADR-0014 gating, and buys little once fail-closed open is the sole public
session face.

Extends [ADR-0014](0014-working-tree-is-the-local-draft.md). Complements
[ADR-0011](0011-sjsf-internal-one-form-recursive-layout.md) (SJSF stays
internal to the form shell).
