# PR564 — SBC reserved Type 1–4 scaffold + controlled structural blanks

## Recovery summary

Mission: continue issue #563 on draft PR #564 / `agent/sbc-reserved-vertical-scaffold` without changing numerical, screening, master-data, or design authority.

```text
TAKEOVER_DECISION = CONTINUE
CLASSIFICATION = ENGINEERING_CRITICAL
MERGE_AUTHORITY = OWNER_ONLY / NOT_GRANTED
```

Current capability/authority remains:

```text
calculationId          = VIB.SBC.SMALL_BORE
assessmentUnitType     = SBC_CONNECTION
lifecycle              = RESERVED
calculationState       = BLOCKED
qualificationState     = BLOCKED
productionExecution    = FORBIDDEN
benchmarkExecution     = FORBIDDEN
screeningAuthority     = NOT_AUTHORIZED
designAuthority        = false
```

Permanent separations:

```text
PLACEHOLDER PRESENCE != IMPLEMENTATION QUALIFICATION
IMPLEMENTATION QUALIFICATION != SCREENING AUTHORITY
SCREENING AUTHORITY != DESIGN AUTHORITY
```

## Live grounding at takeover checkpoint

```text
main SHA                                      = d12ca2d53d1ea0174e1b91fbe3105137fdd2a42b
PR                                             = #564 OPEN / DRAFT
branch                                         = agent/sbc-reserved-vertical-scaffold
merge base                                     = 042025bfe3f9c60ba11d8c653f98af78ac587a64
PR engineering head after structural slice     = e9bc1074b808840922c41277e7687ce2dc9e0933
PR head immediately before this report update  = ff698bd0b95f80b594c1daee5432907f7e23a817
base drift at checkpoint                       = branch behind main by 2 unrelated CII commits
mergeable                                      = true
review threads                                 = none
```

This report update is itself a later report-only commit, so a future takeover must re-read live GitHub head/base/checks rather than treating the parent SHA above as perpetually current.

The two main-only commits are CII work and do not justify rebasing this engineering-critical SBC branch merely to erase drift.

## Mandatory first-read reconciliation

Re-read at takeover:

```text
AGENTS.md
.agents/AGENTS.md
agents/PR564_workreport.md
docs/vibration/SBC-Implementation-Scaffold-v1.md
docs/FIVroadmap.md
Issue #563
Issue #429
Issue #514
PR #564
```

Stale/inherited fact corrected:

- prior workreport/PR body recorded `main=042025...`; live `main` is now `d12ca2d...`;
- prior workreport recorded the scaffold test as `NOT_RUN`; the committed test has now actually executed and is `PASS`;
- hosted workflow entries whose GitHub conclusion says `failure` exposed zero executed steps, `runner_id=0`, and no runner name, so they remain `NOT_RUN / INFRASTRUCTURE_BLOCKED`, not product test failures.

## Appendix A — takeover qualification

Repository-specific implementation takeover gate completed before production-manifest mutation.

```text
A1 Production Trace               20/20
A2 Current Failure Isolation      19/20
A3 Authority / Invariant          20/20
A4 Independent Validation         19/20
A5 Next-Commit / Minimal Patch    19/20
TOTAL                              97/100
minimum challenge                  19/20
required total                     92/100
required minimum                   17/20
DECISION                           CONTINUE
```

### A1 Production trace

Traced public path:

```text
PENDING_ENGINEERING_CALCULATION_DEFINITIONS
→ VIBRATION_SBC_RESERVED_ENGINEERING_CALCULATION_DEFINITION
→ calculateReservedSbc()
→ explicit TYPE_1 / TYPE_2 / TYPE_3 / TYPE_4 reserved route
→ createReservedSbcTypeResult()
```

Observed fail-closed behavior:

```text
public lifecycle = RESERVED
public calculation/qualification = BLOCKED
ui.executionModes = []
reserved executionAllowed = false
reserved result has no `lof`
```

### A2 Current failure isolation

The committed reserved-scaffold regression passes. Therefore there is no demonstrated current scaffold defect to “fix” by changing authority or numerical behavior.

The remaining #563 deficiency is deterministic structural incompleteness before numerical activation:

```text
method specification
→ source/trace register
→ benchmark registry
→ explicit Type 1–4 input contracts
→ applicability/type classification
→ qualified master dependencies
→ pure Type kernels
```

This checkpoint fills only the first three as **non-frozen scaffolds** and stops before source-dependent engineering input definitions.

### A3 Authority / invariants

Protected during the checkpoint:

1. SBC main-line input is a qualified EI main-line assessment with completeness semantics, never FIT LOF alone.
2. Type 1–4 remain explicit branches.
3. D5/D6/D7/D8 are B1 families; each type also requires independent B2 engineering evidence.
4. Production code does not generate/correct benchmark expected values.
5. D7 remains oracle-only, never calibration data.
6. Type-3 candidate code remains salvage/evidence only.
7. T3 curves remain quarantined while source conflict exists.
8. No hidden engineering defaults; only source-provenanced `METHOD_MANDATED_CONSERVATIVE_ASSUMPTION` may introduce a conservative value.
9. Lifecycle state does not replace method/data/master qualification or authority.
10. No lifecycle transition occurs in this slice.

### A4 Independent validation

A native private clone could not be obtained because the execution container could not resolve `github.com` DNS.

Fallback validation was not inferred from source inspection. The committed test and every imported/transitive source file in its dependency set were reconstructed from the authenticated GitHub connector and verified by exact Git blob SHA before executing the unchanged test command. The same procedure was used for the new controlled-structure test after publication.

### A5 Minimal patch boundary

Selected patch:

- freeze structural stage/order names only;
- add non-frozen method specification scaffold;
- add unpopulated controlled source/trace register scaffold;
- add B1/B2 benchmark registry scaffold with **no expected benchmark values**;
- expose exact artifact references and downstream `NOT_FROZEN` / `NOT_QUALIFIED` states from the consumed SBC manifest;
- add regression coverage;
- do not create numerical Type kernels or source-dependent input definitions yet.

This is the smallest useful continuation that improves determinism without inventing engineering facts.

## Active PR/WIP coordination

Overall classification:

```text
COORDINATION_REQUIRED
not BLOCKED_BY_ACTIVE_CLAIM
```

### PR #546

Exact changed-file overlap with PR #564 remains zero. #546 owns Type-3 production-freeze/source-reconciliation evidence and is not an implementation baseline for this work.

### PR #508

No exact-file overlap with this checkpoint, but path/authority adjacency exists under `converters/vibration/sbc/`. Treat its Type-3 code as salvage/evidence only; do not baseline or activate it.

### PR #480

Source-inventory work is adjacent evidence only. It does not grant SBC method qualification.

### PR #483

Vibration master-registry framework is adjacent infrastructure. This checkpoint does not publish or qualify SBC masters.

### PR #539 / #540

Both touch `tabs/engineering-calculation-vibration-family.js`; PR #564 does not modify that file. Existing SBC UI behavior continues through shared consumed state metadata.

### PR #560

Touches `docs/FIVroadmap.md`. PR #564 reads the roadmap but does not modify that active PR's file.

## Controlled structural sequence now encoded

`converters/vibration/sbc/vertical-manifest.js` now exposes:

```text
METHOD_SPECIFICATION
→ SOURCE_TRACE_REGISTER
→ BENCHMARK_REGISTRY
→ TYPE_INPUT_CONTRACTS
→ APPLICABILITY_TYPE_CLASSIFICATION
→ QUALIFIED_MASTER_DEPENDENCIES
→ PURE_TYPE_KERNELS
```

Current states:

```text
METHOD_SPECIFICATION               = SCAFFOLD_PRESENT_NOT_FROZEN
SOURCE_TRACE_REGISTER              = SCAFFOLD_PRESENT_NOT_FROZEN
BENCHMARK_REGISTRY                 = SCAFFOLD_PRESENT_NOT_FROZEN
TYPE_INPUT_CONTRACTS               = NOT_FROZEN
APPLICABILITY_TYPE_CLASSIFICATION  = NOT_FROZEN
QUALIFIED_MASTER_DEPENDENCIES      = NOT_FROZEN
PURE_TYPE_KERNELS                  = NOT_QUALIFIED
```

The manifest also freezes only the structural stage order:

```text
VALIDATE_SBC_CONNECTION
RESOLVE_COHERENT_OPERATING_SCENARIO
RESOLVE_QUALIFIED_EI_MAIN_LINE_ASSESSMENT
CLASSIFY_OR_CONFIRM_SBC_TYPE
RESOLVE_QUALIFIED_TYPE_INPUTS_AND_MASTERS
EXECUTE_QUALIFIED_TYPE_KERNEL
ASSESS_SBC_LOF_REFERENCE_BAND
PRODUCE_REQUIRED_ACTIONS
RETURN_PROVENANCE_EVIDENCE_AUTHORITY
```

No stage contains SBC equations in this slice.

## Method specification status

New artifact:

```text
docs/vibration/SBC-Engineering-Method-Specification-v1.md
```

State:

```text
SCAFFOLD_PRESENT_NOT_FROZEN
```

It records:

- fail-closed authority;
- structural stage boundaries;
- qualified main-line assessment requirement;
- explicit Type 1–4 branch obligations;
- trace namespaces;
- B1/B2 evidence rule;
- no-hidden-default rule;
- requiredActions/provenance/evidence result boundary;
- freeze gate.

It deliberately contains no SBC numerical equations or asserted controlled source locators.

## Source / trace status

New artifact:

```text
docs/vibration/SBC-source-trace-register-v1.md
```

State:

```text
artifactStatus        = SCAFFOLD_PRESENT_NOT_FROZEN
sourceQualification   = NOT_ESTABLISHED
engineeringAuthority  = NONE
```

Required namespaces remain:

```text
SBC-APP-*
SBC-TYPE-*
SBC-EQ-*
SBC-TBL-*
SBC-FIG-*
SBC-CONST-*
SBC-ASS-*
SBC-SRC-*
SBC-UNIT-*
```

The register is intentionally `UNPOPULATED` for exact source identities/rules. Unknown source fields are not guessed from browser evidence, candidate code, cached workbook values, or benchmarks.

Type-3 boundary remains:

```text
D7 = oracle only
T3 curves = BLOCKED_SOURCE_DATA_CONFLICT
#514 = source/engineering evidence owner
```

## Benchmark status

New artifact:

```text
Benchmarks/VibrationSBC/sbc-benchmark-registry-v1.json
```

State:

```text
artifactStatus                    = SCAFFOLD_PRESENT_NOT_FROZEN
benchmarkExecutionAllowed         = false
productionExpectedValueGenerationForbidden = true
```

Registered requirements:

```text
TYPE_1 B1 = EI_APPENDIX_D5; B2 = MISSING_INDEPENDENT_ENGINEERING_EVIDENCE
TYPE_2 B1 = EI_APPENDIX_D6; B2 = MISSING_INDEPENDENT_ENGINEERING_EVIDENCE
TYPE_3 B1 = EI_APPENDIX_D7; B2 = MISSING_INDEPENDENT_ENGINEERING_EVIDENCE
TYPE_4 B1 = EI_APPENDIX_D8; B2 = MISSING_INDEPENDENT_ENGINEERING_EVIDENCE
```

There are **no `expectedValues` arrays/objects** in the registry. Each entry explicitly records `expectedValuesPresent=false`.

Type 3 additionally records:

```text
oracleUseOnly = true
calibrationUseForbidden = true
SBC_T3_CURVES_BLOCKED_SOURCE_DATA_CONFLICT
ISSUE_514_ENGINEERING_EVIDENCE_REQUIRED
```

Boundary/unit/API/UI regressions remain additional evidence and do not replace B2.

## Existing-file backup custody

For `converters/vibration/sbc/vertical-manifest.js`, the repository's exact `utils/backup.js` blob (`cd0c755457bb623b0487200a7d0b7217d8b3478e`) was reconstructed and the mandated command was actually executed against the exact pre-edit manifest blob (`75668afa30975581101cd4672afbd302da328ac7`):

```text
node utils/backup.js save converters/vibration/sbc/vertical-manifest.js "Issue #563 takeover: add controlled structural artifact sequence after reserved scaffold PASS"
STATUS = PASS
backup id = #1 in the local validation reconstruction
```

The backup utility's local `.backups` output is not claimed as a committed branch artifact.

For this workreport edit, exact pre-edit custody was committed before mutation because the connector cannot run the backup CLI against a remote-only file:

```text
pre-edit workreport blob = 27e7e1e8cfe1a874cdf9bf2a3204140ab71d89cb
backup path = .backups/connector-20260816-sbc563/agents/PR564_workreport-before-takeover.md
backup blob = 27e7e1e8cfe1a874cdf9bf2a3204140ab71d89cb
```

This report backup is exact byte-for-byte fallback custody; it is not a claim that `node utils/backup.js save agents/PR564_workreport.md ...` ran remotely.

## Validation truth

### Mandatory reserved-scaffold regression

Command actually executed unchanged:

```bash
node --test tests/vibration-sbc-reserved-scaffold.test.mjs
```

```text
STATUS = PASS
OBSERVATION = 9 tests, 9 pass, 0 fail
ORACLE = implementation-coupled scaffold/authority guardrail regression
EXECUTION_BASIS = exact PR-head Git blobs reconstructed from authenticated connector and hash-verified before execution
```

The mandatory test was executed once before mutation against head `efbb58d...` and again after the structural slice against the hash-matched updated manifest/dependencies. Both executions passed 9/9.

### Controlled structural regression

Command actually executed:

```bash
node --test tests/vibration-sbc-controlled-structure.test.mjs
```

```text
STATUS = PASS
OBSERVATION = 5 tests, 5 pass, 0 fail
ORACLE = implementation-coupled structural/authority guardrail regression
EXECUTION_BASIS = exact published Git blobs hash-matched before execution
```

It proves:

- controlled structural sequence ordering;
- qualified main-line and required-action stage boundaries;
- Type 1–4 artifact references remain explicit;
- input contracts remain `NOT_FROZEN`;
- benchmark execution remains forbidden;
- no benchmark expected values are present;
- B2 evidence remains missing for all types;
- D7 remains oracle-only/non-calibration;
- Type-3 source conflict remains quarantined.

### Hosted workflows

Current PR-head hosted runs observed earlier on the branch:

```text
HP Piping Class I1-I3 Qualification Gate          NOT_RUN / INFRASTRUCTURE_BLOCKED
Vibration AIV Controlled Source Qualification     NOT_RUN / INFRASTRUCTURE_BLOCKED
Vibration Production Freeze Validation            NOT_RUN / INFRASTRUCTURE_BLOCKED
```

Observation: each job exposed `steps=[]`, `runner_id=0`, and no runner name. GitHub's workflow conclusion string `failure` is not treated as executed product failure evidence.

### Native checkout

```text
STATUS = NOT_RUN / ENVIRONMENT_BLOCKED
OBSERVATION = `git clone` failed because `github.com` DNS could not resolve in the execution container
```

### Browser validation

```text
STATUS = NOT_RUN / NOT_REQUIRED_FOR_THIS STRUCTURAL SLICE
```

No UI equations or authority were introduced.

## Exact changed-file ledger at this checkpoint

Current PR changed-file set is the prior scaffold plus this checkpoint. Newly added/modified in this takeover checkpoint:

```text
.backups/connector-20260816-sbc563/agents/PR564_workreport-before-takeover.md
Benchmarks/VibrationSBC/sbc-benchmark-registry-v1.json
agents/PR564_workreport.md
converters/vibration/sbc/vertical-manifest.js
docs/vibration/SBC-Engineering-Method-Specification-v1.md
docs/vibration/SBC-source-trace-register-v1.md
tests/vibration-sbc-controlled-structure.test.mjs
```

Prior PR files still in the diff:

```text
.backups/connector-20260816-sbc563/converters/engineering-calculations/pending-definitions.js
.backups/connector-20260816-sbc563/tabs/engineering-calculation-console-sections.js
converters/engineering-calculations/adapters/vibration-sbc-reserved.js
converters/engineering-calculations/lifecycle.js
converters/engineering-calculations/pending-definitions.js
converters/vibration/sbc/reserved-kernel.js
converters/vibration/sbc/reserved-result.js
converters/vibration/sbc/type1/reserved.js
converters/vibration/sbc/type2/reserved.js
converters/vibration/sbc/type3/reserved.js
converters/vibration/sbc/type4/reserved.js
docs/vibration/SBC-Implementation-Scaffold-v1.md
tabs/engineering-calculation-console-sections.js
tests/vibration-sbc-reserved-scaffold.test.mjs
```

No #546 implementation/source-reconciliation file was modified.

## Active blockers

```text
SBC_ENGINEERING_METHOD_SPECIFICATION_NOT_FROZEN
SBC_SOURCE_TRACE_REGISTER_NOT_FROZEN
SBC_BENCHMARK_REGISTRY_NOT_FROZEN
SBC_TYPE_INPUT_CONTRACTS_NOT_FROZEN
SBC_APPLICABILITY_CLASSIFICATION_NOT_FROZEN
SBC_QUALIFIED_MASTER_DEPENDENCIES_NOT_FROZEN
SBC_PURE_TYPE_KERNELS_NOT_QUALIFIED
SBC_MAIN_LINE_ASSESSMENT_CONTRACT_NOT_QUALIFIED
SBC_REQUIRED_ACTION_CONTRACT_NOT_QUALIFIED
```

Type 3 additionally:

```text
SBC_T3_CURVES_BLOCKED_SOURCE_DATA_CONFLICT
SBC_TYPE3_INDEPENDENT_B2_NOT_FROZEN
EXISTING_TYPE3_CANDIDATE_NOT_PRODUCTION_AUTHORITY
```

## Highest risk

The highest risk remains accidental authority promotion by treating structural artifact presence, candidate code, or green implementation-coupled tests as engineering qualification. In particular, the new method/source/benchmark artifacts are scaffolds, not frozen evidence; no agent may infer `QUALIFIED`, benchmark execution authority, screening authority, or design authority from their existence.

## EXACT_NEXT_ACTION

Continue only inside #563 and preserve `RESERVED/BLOCKED`.

Populate the controlled source/trace register with **exact source identities and locators for the non-numerical applicability/type-classification and input-definition rules first**, using independently reviewable controlled-source evidence. Then use those populated trace rows to draft the explicit Type 1–4 input-contract fields and applicability/type-classification contracts.

Hard stops for that next action:

```text
- do not invent any SBC engineering input field from candidate code alone;
- do not copy Type-3 candidate behavior as the general SBC contract;
- do not activate or interpolate T3 curves;
- do not create benchmark expected values from production code or D7 calibration;
- do not publish/qualify masters;
- do not change lifecycle from RESERVED;
- do not implement numerical Type kernels until source-grounded input/applicability contracts and B1/B2 evidence are controlled.
```
