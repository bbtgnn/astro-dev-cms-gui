# Astro schema load and UI metadata

Type: research
Status: claimed

## Question

Against Astro’s current Content Layer / content collections APIs (primary docs and source): how are collection definitions and Zod (or other) schemas loaded at **dev time**? Can a **field schema** carry UI metadata beside validation without breaking Astro’s loaders? What are viable patterns for dynamically importing those defs to generate an **authoring shell** UI (in-place enrichment vs parallel map vs overlay)? Cite constraints that will force the field-schema and discovery grilling tickets.
