# PR483 — Governed Vibration Master Registry

## Recovery header

- Source task: #450
- PR / branch: `#483` / `agent/vibration-master-framework`
- Base at allocation: `main@36748e381012bb52ba720cc288101948115721bb`
- Tested implementation commit: `3a69091ef733e56495bc59ef5b4f9509c58534de`
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Recovery state: CONTINUE
- Coordination: SAFE
- Authority invariant: no engineering values, no active EI master publication, no screening/design promotion.

## Mission / result

Implement the shared fail-closed `VibrationMaster.v1` framework required by #450 without waiting on the intentionally skipped FIT release/browser gate (#479) or SBC DocumentEvidence discovery gate (#480).

The bounded framework slice is implemented. It is independent of SBC values and source-page selection and provides deterministic master content hashing, strict schema validation, candidate/active/retired isolation, explicit publication transitions, retired/unknown fail-closed resolution, immutable resolver provenance, and a CLI validator.

## Live grounding / coordination

Base at allocation: `main@36748e381012bb52ba720cc288101948115721bb`.

Related open work at grounding:
- #479 FIT reproducibility — separate FIT files; no master-framework overlap.
- #480 SBC controlled-source recovery — owns SBC inventory/recovery planning; PR483 does not touch its artifacts.
- #471 T2.8 valve-closure candidate — separate T2.8 candidate evidence.

No active PR claimed `converters/vibration/masters/**`. Coordination classification: `SAFE`.

## Appendix A — implementation authorization

- A1 Production Trace: 19/20
- A2 Current Failure Isolation: 19/20
- A3 Authority / Invariant: 20/20
- A4 Independent Validation: 18/20
- A5 Next-Commit / Minimal Patch: 19/20

**Total: 95/100; minimum challenge 18/20 — PASS.**

The authorization was granted before production mutation. Validation uses synthetic fixtures rather than any retained EI target value.

## Implemented contract

### Canonical hashing

`converters/vibration/masters/canonical.js`

- recursively stable JSON ordering;
- rejects non-JSON/non-finite values;
- SHA-256 engineering-content hash;
- hash includes revision, governed data/applicability, and controlled source identity/locator;
- publication state is excluded so `CANDIDATE -> ACTIVE -> RETIRED` does not change engineering-content identity;
- immutable/deep-frozen results.

### Validation

`converters/vibration/masters/validate.js`

- exact `VibrationMaster.v1` schema;
- strict known-field contract: unknown top-level/source/locator fields fail instead of silently escaping the hash;
- source repository, 40-hex commit, Git blob SHA-1, byte size and locator required;
- source types restricted to `TABLE | RULE | CURVE | EQUATION | PROJECT_EVIDENCE`;
- optional PDF page must be integer >= 1;
- states restricted to `CANDIDATE | ACTIVE | RETIRED`;
- supplied content hash must exactly match canonical content.

### Registry / resolver

`converters/vibration/masters/registry.js`

- immutable `VibrationMasterRegistry.v1`;
- duplicate `masterId@revision` rejected;
- multiple ACTIVE revisions for one master rejected;
- candidate addition never mutates the active record;
- resolver resolves ACTIVE only;
- distinct failure codes for unknown, not-active and retired masters;
- explicit publication transitions only:
  - `CANDIDATE -> ACTIVE | RETIRED`
  - `ACTIVE -> RETIRED`
  - retired reactivation forbidden;
- `VibrationMasterResolution.v1` emits exact master ID/revision/content hash and source repository/commit/blob/path/locator.

### CLI

`scripts/validate-vibration-master.mjs <master.json>` validates/seals a JSON master and emits `VibrationMasterValidationReceipt.v1`. Invalid input exits nonzero with the stable validation error.

## Final changed-file ledger

New production/support files:
- `converters/vibration/masters/canonical.js`
- `converters/vibration/masters/validate.js`
- `converters/vibration/masters/registry.js`
- `converters/vibration/masters/index.js`
- `scripts/validate-vibration-master.mjs`

New regression:
- `tests/vibration-master-registry.test.mjs`

Handoff:
- `agents/PR483_workreport.md`

The superseded pre-PR WIP report was removed after backup once PR483 had a stable identity.

No pre-existing production or test file was edited.

## Executed validation ledger

- live main/issue grounding: **PASS** / SOURCE_INSPECTION / AUTHORITATIVE_REFERENCE
- active overlap check: **PASS** / GITHUB_PR_SEARCH / AUTHORITATIVE_REFERENCE
- Appendix A implementation qualification: **PASS 95/100** / REPOSITORY_TRACE / IMPLEMENTATION_AUTHORIZATION
- `node --check` on all six implementation/test/CLI files: **PASS** / LOCAL_EXECUTION / IMPLEMENTATION_COUPLED
- `node --test tests/vibration-master-registry.test.mjs`: **PASS 15/15** / LOCAL_EXECUTION / SYNTHETIC_INDEPENDENT_FIXTURES
- CLI valid-candidate validation: **PASS** / LOCAL_EXECUTION / SYNTHETIC_INDEPENDENT_FIXTURE
  - emitted content hash `sha256:52036478013d78bc26525f7fe50f96bd8f7fb1b740010dea5de973c6ef97bf5d`
- CLI invalid locator (`pdfPage=0`): **PASS fail-closed** / LOCAL_EXECUTION / SYNTHETIC_NEGATIVE_FIXTURE
  - exit status 1
  - `VIBRATION_MASTER_SOURCE_PDF_PAGE_INVALID`
- exact tested implementation bytes vs PR branch Git blobs: **PASS 6/6** / GIT_BLOB_IDENTITY / AUTHORITATIVE_REFERENCE
- release-manifest integration: **NOT_APPLICABLE** for this isolated framework-only PR; #479 currently owns FIT release-manifest work and was explicitly skipped by owner direction
- browser validation: **NOT_APPLICABLE**; no UI behavior is changed
- EI master reconciliation/numerical qualification: **NOT_APPLICABLE**; this PR contains no EI master values

Exact tested blob identities:

```text
canonical.js                      7f917c3c58fe43e3aedb21bcbc3192fcb99e6ee4
validate.js                       5f12c3b17bca1e891bf2602827bd09685abea323
registry.js                       bb24a76f470af5c3076bf9cf7dbc328f59ca72fd
index.js                          8e3a64aefb0ecf26df4acf87eb9cca92d1ea2564
validate-vibration-master.mjs     72f79b46336fc977afdb64d88b59421a7108448f
vibration-master-registry.test    d638e66cf0f4263167b2c55d9de6d2e281c593ac
```

All new production JS modules are under the repository 300-line limit.

## Backup compliance

Before updating this existing workreport, its exact GitHub blob `fc38d80ed699be4bb43ee1e17b02df2f40e8e0a8` was materialized locally and backed up with:

```text
node utils/backup.js save agents/PR483_workreport.md "Update executed PR483 validation evidence"
```

Before removing the superseded WIP report, its exact GitHub blob `2d1e9dccd76fd39c403c5d5bfe843e87a851a29d` was likewise backed up.

No existing production/test files required backup because the implementation adds new files only.

## Negative assurance

Unchanged:
- all numerical vibration kernels;
- current AIV screening authority;
- FIT benchmark authority;
- SBC/T2.8/T2.9/T4 source values;
- #480/#471 extraction/reconciliation state;
- engineering UI behavior;
- runtime/writer/canvas ownership.

No source-specific engineering assumption, default lookup, interpolation rule, or authority transition was introduced.

## Highest risk / current state

The highest-risk invariant—candidate/retired data accidentally resolving as active—is covered by explicit resolver state checks and permanent synthetic regressions.

PR483 remains draft and unmerged. No owner merge authorization has been given for this PR.

## EXACT_NEXT_ACTION

Review the final PR483 diff/CI metadata. If this framework slice is accepted later, the next independent #450 PR should consume it for the generic controlled-source register/extractor or a source-reconciled master; do not place EI numerical values into PR483.
