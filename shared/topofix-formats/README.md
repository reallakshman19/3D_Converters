# TopoFix shared formats v1

Two JSON files carry work between the lanes. Nothing else is shared.

- **Map file** (`topofix.map`): approved SOURCE→TARGET pairs. Written by L1 Mapping, read by L2/L3/L4.
- **Change set** (`topofix.changeset`): edits to one base file: which item, which field, the exact old text, the new value, the evidence, the approval. Written by whoever finds the edit, applied by L2 (CII) or L3 (XML).

Both files are plain JSON. Every file points at its inputs by `sha256`, so a stale file is caught before anything is applied.

## Refs (how an item is named)

| kind | keys |
|---|---|
| `cii` (element) | `elementIndex` (0-based int), `fromNode`, `toNode` |
| `cii-node` | `node` |
| `xml` (node) | `branchOrdinal`, `branchName`, `nodeOrdinal`, `nodeNumber`, `componentRefNo` |

The `xml` keys are the ones `applyXmlSourceEdits` matches on. `cii-node` counts as kind `cii` when checking against a header kind.

## Files

- `schema/map.v1.schema.json`, `schema/changeset.v1.schema.json`: JSON Schema (structure).
- `validate.mjs`: plain Node, no packages. Enforces all 13 rules, including the cross-item ones a schema cannot express.
- `examples/*.valid.json`: files that must pass. `examples/invalid/Rn-*.json`: one file per rule (R13 has two: length mismatch and overlap), must fail with exactly that code.

```
node validate.mjs <file>      # prints OK, or one "Rn  message" line per problem; exit 1 on failure
node validate.mjs --selftest  # exit 0 only if every valid example passes and every invalid one fails with its own code
```

## Rule codes

| code | rule |
|---|---|
| R1 | `format` and `version` as stated |
| R2 | every `sha256` is 64 hex characters |
| R3 | `pairId` / `changeId` unique |
| R4 | refs and required fields well formed |
| R5 | map pair kinds match header `source.kind` / `target.kind` |
| R6 | change target kind matches `base.kind` |
| R7 | no two changes share target and field |
| R8 | approved item has `by`/`at` (`approvedBy`/`approvedAt` for pairs) |
| R9 | `newValue` 0 needs `approval.zeroConfirmed: true` |
| R10 | approved pairs are 1:1 (no source or target ref twice) |
| R11 | `evidence.source = map` needs `pairId` |
| R12 | if `base.kind` is `xml` and `approval.approved` is true, `approval.ownerApproved` must be true (matches `applyXmlSourceEdits`) |
| R13 | `span.end - span.start` equals the length of `oldToken`; spans do not overlap within one change set |

## Optional change fields

- `approval.ownerApproved` (boolean): physical-owner approval, separate from `approved`. Required by R12 for XML change sets.
- `span {start, end}` (ints, `0 <= start < end`): character offsets of `oldToken` in the base file. A **hint only**; the `target` ref stays the authority. A malformed span is R4.

## How existing edit sources fill Change set fields

| Change set field | Step-10 "Source-backed XML edit" (`applyXmlSourceEdits`) | XCU Property Transfer row |
|---|---|---|
| `changeId` | new id per edit | new id per row |
| `target` | `{kind:"xml", branchOrdinal, branchName, nodeOrdinal, nodeNumber, componentRefNo}` taken from the edit | the CII ref of the target item. the executor works on byte spans, not refs, so the producer supplies the ref (see gap 1) |
| `field` | `propertyId`, e.g. `Node/Weight` | the property name being transferred, e.g. `WEIGHT`, `DIAMETER` |
| `unit` | descriptor unit, e.g. `SOURCE_WEIGHT_KG` | unit of the property, if any |
| `oldToken` | `originalToken` (must equal the text in the file) | `before` of the claim (exact text in TARGET0) |
| `newValue` | `newValue` | `after` of the claim |
| `evidence.source` | `map` (via the XML↔CII pair) or `reference-cii` | `map` or `reference-cii`, per the row's origin |
| `evidence.pairId` | the pair used | the pair used |
| `approval.approved` | `approved` | row approved |
| `span` | not used (the edit matches by ref) | `{start, end}` of the claim |
| `approval.ownerApproved` | `ownerApproved` | row's owner approval, if XML |
| `approval.by` / `.at` | **not in the existing edit** (see gap 2) | row approver / time |
| `approval.zeroConfirmed` | `zeroConfirmed` | `zeroConfirmed` if the row has it |

## Known gaps against the existing code

1. The Property Transfer executor (`cii-workspace-find-replace-executor.js`) claims `{start, end, before, after}` carry no element ref or field name, so `target` and `field` must come from the producer; only `span`, `oldToken` (`before`) and `newValue` (`after`) are filled from the claim.
2. `applyXmlSourceEdits` edits carry no `by`/`at`, so whoever produces the Change set must add them.
