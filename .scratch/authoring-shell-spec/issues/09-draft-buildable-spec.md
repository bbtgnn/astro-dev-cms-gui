# Draft the buildable authoring-shell spec

Type: task
Status: resolved
Blocked by: 02, 03, 04, 05, 06, 07, 08

## Question

Assemble `.scratch/authoring-shell-spec/spec.md` from the closed decision tickets and research answers: a hand-offable buildable spec meeting the outline from [Buildable spec outline](06-buildable-spec-outline.md). Preserve **open threads** (shell commands; `i18n` / `image` / `blocksLayout`) as named unresolved sections—do not invent deep contracts for them.

## Answer

Assembled [spec.md](../spec.md) per outline §§1–7: Framing (self-host validation), core loop, package map + Deno/Node, field-schema + discovery, IA/write-back, open-thread seams, phased MVP P0–P6. Provenance links on each closed-route section. Fog left unresolved: multi-markdown serialization, singleton v1, exact install URL, deep open-thread behavior.

## Comments

- 2026-09-09: Drafted buildable spec from locked tickets 01–08.
