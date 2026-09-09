# End-user form UI composition

Type: grilling
Status: open
Blocked by: 07, 04, 14

## Question

Lock how **consumers** (schema authors / Astro hosts) compose **form shell chrome** beyond field-level `.meta({ ui: Component })` and sjsf `theme` / `ui:components`: which surfaces are overrideable (`CmsForm`, editor actions, layout slots), where the API lives (`@cms/form` vs `@cms/components` vs host), and what stays dev-only prototype vs installable contract.

## Answer

*(unset — grill in progress)*

## Comments

- 2026-09-09: Opened after rich `image` landed (78a62a5). Prior art: field widgets via FieldUi + `cms-theme`; `CmsForm` debug chrome hardcoded; `ShellEditor` owns save/delete/back; `@cms/components` is placeholder + shadcn stub.
