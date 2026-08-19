# WIP — T4 thermowell controlled-source qualification

## Recovery header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
MAIN_HEAD_LAST_CHECKED: 95ee50ff78d81465f3e4968f62767d866f8b9da8
MERGE_BASE: 95ee50ff78d81465f3e4968f62767d866f8b9da8
GROUNDING_EPOCH: GE-001
CURRENT_STAGE: SOURCE_QUALIFICATION_EVIDENCE
CURRENT_BLOCKER: CONTROLLED_PDF_PAGE_EXECUTION_ENVIRONMENT_BLOCKED
HIGHEST_RISK: MERGED_T4_CANDIDATE_OR_ASME_LABEL_PROMOTED_WITHOUT_CONTROLLED_METHOD_RECONCILIATION
EXACT_NEXT_ACTION: COMMIT_T4_BLOCKED_METHOD_CONTRACT
```

Mission: issue #654 under #450/#429, using merged PR482 as candidate baseline. This slice may document and test source/method qualification only. It must not change the PR482 candidate rows, source-register state, numerical implementation, Screening authority, design authority, or workflow files.

Controlled source:

```text
reallaksh19/Common@fb549185b9b27edc2379734240320a85c5bef9f6
EI - AVIFF Guidelines 2nd Edition.pdf
blob 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
size 10348594
T4.2.2 / Table T4-1 / printed page 87 navigation locator
```

Merged candidate baseline:

```text
ValidationRecords/VibrationMasters/ei-aviff-t4-wall-modifier-candidate-v1.json
publicationState = CANDIDATE
qualificationStatus = NOT_QUALIFIED
engineeringAuthority = NONE
screeningAuthority = NOT_AUTHORIZED
designAuthority = false
```

Current source registry intentionally exposes a `CONFLICTED` thermowell source binding between EI T4 and an ASME PTC 19.3 TW repository label. Preserve that fail-closed state; do not combine ASME data with the EI candidate.

Public copies corroborate Table T4-1 and high-level Flowchart T4-1 only. They are non-authoritative navigation/reconciliation material.
