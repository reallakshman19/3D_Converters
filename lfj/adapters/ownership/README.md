# LFJ V4 R02 — authoritative ancestor Site/Zone facts

**Owner issue:** [#1064](https://github.com/reallaksh19/3D_Converters/issues/1064). Parent [#1042](https://github.com/reallaksh19/3D_Converters/issues/1042), V3.2 ENFORCED graph binds `C1_OWNER=7/130` points to this leaf. Exclusive product writer `lfj/adapters/ownership/`; source-level scope only, no existing application changes.

## Why this exists
Actual legacy [Resolver JSON hierarchy scope](https://github.com/reallaksh19/3D_Converters/blob/main/tabs/xml-cii-2019-standalone/xml-cii-json-hierarchy-scope.js) calls `firstField` regex over an **entire serialized branch slice**, not merely its own attributes. Independent original-source execution at blob `a29ed52cb907d91a6009c158d718c9800a0c8f44` gave a parent with no owner an erroneous `CHILD-ONLY` zone, and gave a parent with only own `OWNER_SITE=PARENT-SITE` the child's `OWNER_ZONE=ZONE-CHILD` as scope. Those are RED against the R02 owner-local contract.

**API:** `resolveOccurrenceOwnership(occurrences)`. Each input source fact has original `sourceId`, unique `occurrenceId`, same-source `parentOccurrenceId`, `type`, `name`, and **own-only** `attributes`. The function returns a frozen, ordered projection without parsing original bytes or changing any input record. R03 is responsible for original bytes, R04 for full JSON syntax and R05 for independently attested parent/span/occurrence source validity. An arbitrary untrusted caller array is **not** proof of original-source custody.

## Explicit and falsifiable semantics

- Identity is `(sourceId, occurrenceId)` only, **never name or NodeNumber**. Duplicate names under two different Sites remain two occurrences. Ordinary GC-PW `sourceId` is preserved, never replaced with a SHA identity.
- Parent/child relationship uses only `parentOccurrenceId` referencing a record **within the same source**. Missing parent, cycle and duplicate identity fail typed. Inputs may be in any traversal order; returned projections preserve input order.
- A typed `SITE` with own `name` establishes the local Site and clears inherited Zone; a typed `ZONE` establishes local Zone, inherits its Site. Typed name may be repeated as an agreeing own `OWNER_SITE`/`OWNER_ZONE` but may not contradict it.
- Own `OWNER_SITE` (or `SITE_ID`) and `OWNER_ZONE` (or `ZONE_ID`) override ancestor context **downwards only**. Different own Site clears a previously inherited Zone unless a new Zone is explicit. Same-node incompatible aliases fail `OWNER_CONFLICT`.
- `attributes.OWNER` is retained as separate `branchOwner`; it never automatically means Site or Zone. No owner is represented as `null`, not inferred from descendants, geometry, material, or unsupported metadata.
- Inherited/prototype attributes do not create declarations: own record keys only. This contract cannot grant `EDIT`, `EXPORT`, 4 Preview/Weight review rights or CII source authority.

Errors are `SourceOwnerError` with typed codes `INVALID_OCCURRENCE`, `INVALID_OWNER`, `DUPLICATE_OCCURRENCE`, `PARENT_NOT_FOUND`, `ANCESTRY_CYCLE`, `OWNER_CONFLICT`. Do not replace them with an empty Site/Zone or rewrite source.

## RED → GREEN evidence and exact-command qualification
The 16-case independent truth table `source-ownership.test.mjs` was committed at **RED-first** commit `a354ec02f1f7d3282d9caf3d64266c582b0f6ff9`, before production `11041ac374921913719e4d1d0df1ad991a93ae4d`. **Actual hosted RED:** [Actions #37789542163](https://github.com/reallaksh19/3D_Converters/actions/runs/37789542163), failed `ERR_MODULE_NOT_FOUND` both Node 22 and 24. Independent original legacy code RED is recorded above.

```bash
node --test lfj/adapters/ownership/source-ownership.test.mjs
```

The 16 cases cover parent-child contamination; typed SITE/ZONE inheritance; branch OWNER separation; own-site reset; conflicting aliases and typed site/zone names; bad owner scalars; duplicate same-named siblings; cross-source parent, repeated identity, cycles and immutable original `sourceId`.

**Qualification boundary:** success proves a pure own-node ancestry projection, not real 30/90 MB responsive parsing, R05 index/span correctness, domain export, or accurate engineering CII outputs. Those require independently qualified downstream leaves and original-source goldens.
