# XML to CII 2019 Standalone restraint audit

In v0.6, open **XML→CII 2019 Standalone → 10 Output / Run**, run conversion, and find **Restraint enrichment audit** below the results. Each model has its own panel. Search by node, member, field or rule; download JSON, CSV or the readable HTML audit. Existing runs must be run again to capture decisions.

**CII field agreement and source coverage are separate results.** “2 of 2 recorded restraints verified” checks those two emitted records; it does not prove the JSON restraints were transferred. Source coverage inventories original support occurrences before enrichment, records the current compatibility policy and all its resolved targets, and checks expected restraint types/gaps at every target. Missing restraints, mismatched gaps, unmatched sources, disabled JSON generation and unclassified source members remain explicit. Position-group resolution can apply one member at several original XML nodes; checking every target does not qualify a unique physical-vertex correspondence or its datum. XML-only input is labelled `NO_STAGED_JSON`, never complete JSON coverage. Every source occurrence/path and its disposition is retained in JSON, CSV and HTML, including excluded branches.

The run manifest includes the audit implementation revision, consumed XML/JSON digests, source kind, options and relevant support configuration. The consumed JSON digest identifies the actual run input after branch selection; it can differ from the original file intake digest. An intake “COMMITTED” receipt alone does not show that a subsequent run consumed that file.

Steps 6–10 wait when a selected LFJ JSON source is `SELECTED`, `INDEXING`, `COMMIT_PENDING`, failed or revoked. Wait for `INDEX_COMMITTED` in Step 3 and choose **Check input readiness** to complete the existing checksum-verified handover. A selected unfinished JSON file must never silently become an XML-only run. A workflow with no JSON selected keeps its XML-only route.

When **Download audit JSON** is blocked, the panel shows the exact currency reason and changed job fields where available. **Download recorded diagnostic JSON** remains available to investigate the recorded run. It is explicitly `RECORDED_DIAGNOSTIC`, contains the currency failure and the recorded evidence, and grants no current-input, complete-transfer or engineering acceptance. The regular current-audit downloads retain their source/configuration/output and integrity checks.

The active compatibility workflow records its actual selected source members/rules and restraint writes, with snapshots of parent enrichment, DTXR fallback, process parity, ATTA defaults, MDS closure and available native enrichment. Group-derived fallback decisions retain the actual policy inputs and original member paths. Original XML, effective configuration, requested entries and emitted CII fields remain distinct. A source kind decision does not make generated stiffness, friction or direction values source-authored. Request/output seals prevent downloading an earlier run's audit as current. `PARTIAL`, `FAILED`, `CII_NOT_RUN` and `CONVERSION_HELD` identify missing provenance, failed comparisons or unavailable output. An audit error retains the converter output and is shown explicitly.

This observational compatibility journal complements the independent pre-Final audit below. It does not activate the optional physical-vertex path, qualify a new datum, authorize classification changes, or establish engineering/application acceptance. Native-only generated constraints outside recorded XML decisions and TopoFix reconciliation are not silently promoted to source-proven restraint authority.

The Output/Run restraint audit links the original XML occurrence and JSON member to the actual mapping rule, before/after values and emitted CII block/slot/line. JSON, CSV and HTML downloads retain the input/configuration/output identities. Existing runs without a recorded audit are labelled accordingly; changing the inputs/configuration/output invalidates current-run evidence.

The separate root pre-Final profile includes the tested Step 7 Test/Save parity corrections: explicit source fields execute, saved row edits survive migration, generated labels remain fallback-only, and Preview separates descriptive labels from actual XML/CII types. Configured type profiles apply when source NODETYPE is absent; valid source NODETYPE after configured mutation retains priority. The active compatibility audit observes its existing evaluator; this integration does not port the separate draft field-parity changes or switch its runtime.

The optional `xml229PhysicalVertexPrefinal` path preserves each original JSON restraint member, including same-kind and same-value occurrences, on its connected original source vertex. It has a six-slot limit and independent original-source native Python replay. It retains source geometry, mass owners and authored XML restraint authority. Its default is OFF. It is not a general legacy-path cutover.

For qualified coordinate bases, the existing support configuration accepts an explicit query policy:

```json
{
  "xml229SourceCoordinatePolicy": {
    "schema": "XML229.SourceCoordinatePolicy.v1",
    "positionField": "POS",
    "translationMm": ["0", "0", "0"],
    "xmlQuantumMm": "0.01",
    "identityMode": "exact-branch-member"
  }
}
```

POS/POSI selection and translation are explicit. This qualified profile checks a closed half-quantum envelope against the unchanged original XML, using exact arithmetic. It requires exact branch/member identity and preserves disconnected revisits. Invalid policies, competing legacy datum settings, missing/duplicate identities and out-of-envelope values hold. The audit records and independently challenges the coordinate witness.

Generic source attachments can additionally delegate to the existing original-XML ATTA default route:

```json
{
  "xml229SourceAttachmentPolicy": {
    "schema": "XML229.SourceAttachmentPolicy.v1",
    "unclassifiedAtta": "existing-xml-default"
  }
}
```

This requires the explicit coordinate policy. Only source-identified generic ATTA records without explicit stress fields/semantic descriptions qualify. Configured classifications win. ANCI, invalid source codes, duplicate original-object reuse and overlap with projected restraint vertices hold. Original authored restraints survive. Default-derived restraints remain configuration authority, with the JSON attachment retained as corroboration. The audit census accounts for every projected or delegated source member; hash-recomputed omissions and relabelling are rejected.

These policies do not activate the optional path. Qualification is source-specific. Actual native CII delegation was exercised on a zero-datum fixture; nonzero translation has separate pre-Final/source-replay coverage. General translated mandatory-attachment CII acceptance is not established. A private input qualification remains held by native original-authored/configured-profile differences and downstream staged-position constraints. Retain all holds and keep the optional path disabled for unqualified inputs.

Validation for this change includes 304 local checks with real native Python/CII, independent source reconstruction and deliberate corruption/forgery cases. Literal fixtures, explicitly configured lightweight DOM/transport fixtures, real native execution and browser observations are distinct evidence classes. No distinct-author review, accepted native Final UI or CAESAR II application acceptance is claimed. The pull-request work report records the delivery candidate, reproducible suite and remaining limitations.
