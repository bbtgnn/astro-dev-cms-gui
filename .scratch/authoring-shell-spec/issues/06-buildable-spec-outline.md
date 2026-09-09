# Buildable spec outline

Type: grilling
Status: resolved

## Question

Agree the section list and done-bar for the buildable product/spec (problem, users, non-goals, core loop, package map, field-schema model, IA/routes, write-back, extension **open threads**, Deno/Node notes, phased MVP). What must be present before [Draft the buildable authoring-shell spec](09-draft-buildable-spec.md) can run?

## Answer

### Reader & done-bar

- **Primary reader:** parallel implementer scaffolding from locked tickets (hand-offable build brief).
- **Done-bar for [Draft the buildable authoring-shell spec](09-draft-buildable-spec.md):** every locked ticket Answer inlined into the closed-route sections; **open threads** named with seams only (no deep contracts); map fog either folded into §§4.1–4.2 (via 07/08) or listed unresolved. Do not invent interim product defaults for fog so implementers skip 07/08.
- **Depth:** inline locked Answers (and research gist where needed); tickets remain provenance, not required reading for the closed route.
- **Provenance:** each closed-route section ends with `Informed by:` ticket titles + links.
- **This ticket** locks the outline only; `spec.md` is written by 09.

### Spec TOC (hierarchy)

```
1. Framing
   1.1 Problem / motivation
   1.2 Users & self-host validation
   1.3 Non-goals / out of scope

2. Core authoring loop

3. Architecture
   3.1 Package map (@cms/*)
   3.2 Deno / Node runtime notes

4. Content model
   4.1 Field-schema model          ← after 07
   4.2 Collection & schema discovery ← after 08

5. Shell surface
   5.1 IA / routes
   5.2 Write-back / write mode / writer

6. Open threads / extension seams

7. Phased MVP                      ← stub until 07/08; 09 fills
```

- Spec prose prefers **self-host validation** over “dogfood” (see `CONTEXT.md`).
- §7 stays outline-only until 07/08 resolve; 09 fills concrete phases from those Answers.

### §2 Core authoring loop — required beats

When 09 writes §2, cover at least: discover/list collections → list entries → open entry → edit via **form shell** → **write-back**; plus **create**, **delete**, and **validation failure**. No UI chrome / IA detail (that belongs in §5).

### §6 Open threads (named list, seams only)

1. Shell commands / non-FS **writers** (`runCommand`, `githubRepoWriter`, …)
2. Custom fields: `i18n`, `image`, `blocksLayout`
3. End-user form UI composition
4. **Schema builder** UI

### Informed by

- Map Destination + Notes; locked [Monorepo package boundaries](04-monorepo-package-boundaries.md) + [Write-back contract](05-write-back-contract.md); blockers for 09: 02–08.

## Comments

- 2026-09-09: Grilled outline; hierarchy + done-bar + loop beats + open-thread list; section 1.2 avoids “dogfood.”
