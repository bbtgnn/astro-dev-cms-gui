# Multi-markdown serialization

Type: grilling
Status: claimed
Blocked by: 05, 07, 08

## Question

Given write-back `{ id, collection, data }` with multiple `widget: 'markdown'` fields and no privileged Astro `body`: how do we **read/write** one on-disk content file (frontmatter + body/segments) ↔ `data`? Lock v1 rules for `@cms/crud` / writers without inventing `role`/`segment` FieldUi options (rejected in [Field schema model](07-field-schema-model.md)).
