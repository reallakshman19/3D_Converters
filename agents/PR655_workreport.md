# PR655 Work Report — T4 controlled-source method qualification

## Recovery header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: READ_ONLY
PR_HEAD_OBSERVED: 41d907b53c132d773f0abe484e7ab1d23eadf1eb
REPORT_BASIS_HEAD: 41d907b53c132d773f0abe484e7ab1d23eadf1eb
MAIN_HEAD_LAST_CHECKED: 95ee50ff78d81465f3e4968f62767d866f8b9da8
MERGE_BASE: 95ee50ff78d81465f3e4968f62767d866f8b9da8
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: NOT_QUALIFIED_FOR_NUMERICAL_MUTATION
GROUNDING_EPOCH: GE-002
CURRENT_STAGE: SOURCE_QUALIFICATION_BLOCKED
CURRENT_BLOCKER: CONTROLLED_PDF_PAGE_EXECUTION_ENVIRONMENT_BLOCKED
HIGHEST_RISK: EI_T4_OR_ASME_DATA_PROMOTED_WITHOUT_CONTROLLED_METHOD_RECONCILIATION
EXACT_NEXT_ACTION: EXECUTE_CONTROLLED_T4_PAGES_IN_BINARY_CAPABLE_RUNTIME
```

## Mission

Issue #654 under #450/#429. Preserve merged PR482 Table T4-1 as a non-authorizing candidate while recording the controlled-source blockers for the full EI T4 method.

No PR482 candidate row, source-register state, numerical implementation, ASME method, Screening authority, design authority, or workflow file is changed.

## Controlled source

```text
reallaksh19/Common@fb549185b9b27edc2379734240320a85c5bef9f6
EI - AVIFF Guidelines 2nd Edition.pdf
blob 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
size 10,348,594 bytes
T4.2.2 / Table T4-1 / printed page 87 / navigation only
```

Controlled page execution remains `NOT_RUN / ENVIRONMENT_BLOCKED`: the connector reaches exact binary identity but cannot expose the PDF pages because it attempts UTF-8 decoding of binary bytes.

## Candidate baseline

Merged PR482 remains:

```text
publicationState      CANDIDATE
qualificationStatus   NOT_QUALIFIED
masterValuesPublished false
engineeringAuthority  NONE
screeningAuthority    NOT_AUTHORIZED
designAuthority       false
```

Four Table T4-1 rows are retained exactly; interpolation, nearest-band fallback and implicit `STD` mapping remain forbidden.

## Candidate-only public corroboration

Public searchable copies corroborate the four candidate rows and broad Flowchart T4-1 sequence only. They remain non-authoritative. Equations (1)-(5), constants, geometry formulas, exact 0.8 equality semantics, applicability and corrective-action wording are not qualified.

## Method identity

Current source registry intentionally marks the thermowell binding `CONFLICTED` between EI T4 and an ASME PTC 19.3 TW repository label. Preserve that fail-closed conflict; do not combine methods.

Required conceptual split:

```text
EI_AVIFF_T4_THERMOWELL_ASSESSMENT
ASME_PTC_19_3_TW_DETAILED_ASSESSMENT
```

## Deliverables

```text
ValidationRecords/VibrationMasters/t4-source-qualification-blocked-v1.json
docs/vibration/T4-Controlled-Source-Reconciliation-v1.md
tests/vibration-t4-source-contract.test.mjs
```

Regression source pins the merged candidate's non-authorizing state, exact rows, no hidden lookup fallback, pending threshold equality, source-register navigation-only state and EI/ASME conflict. Repository-native execution is unavailable and is not represented as PASS.

## Allocation truth

```text
main        95ee50ff78d81465f3e4968f62767d866f8b9da8
head        41d907b53c132d773f0abe484e7ab1d23eadf1eb
ahead       6
behind      0
files       6 new-only
mergeable   true after transient initial computation
```

## Authority

```text
engineeringAuthority             NONE
screeningAuthority               NOT_AUTHORIZED
designAuthority                  false
productionKernelAuthorized       false
sourceRegisterPromotionAllowed   false
asmeMethodImportedIntoEiMaster   false
```

PR655 is draft/open/unmerged. `MERGE_AUTHORITY = OWNER_ONLY / NOT_GRANTED_FOR_PR655`.
