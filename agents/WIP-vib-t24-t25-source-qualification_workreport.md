# WIP — T2.4 / T2.5 controlled-source qualification

## Recovery header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
MAIN_HEAD_LAST_CHECKED: 6c3109935eb2d30652eab441080464777091b1bb
MERGE_BASE: 6c3109935eb2d30652eab441080464777091b1bb
GROUNDING_EPOCH: GE-001
CURRENT_STAGE: SOURCE_QUALIFICATION_EVIDENCE
CURRENT_BLOCKER: CONTROLLED_PDF_PAGE_EXECUTION_ENVIRONMENT_BLOCKED
HIGHEST_RISK: SECONDARY_SYNTHESIS_PROMOTED_WITHOUT_CONTROLLED_RECONCILIATION
EXACT_NEXT_ACTION: COMMIT_BLOCKED_SOURCE_CONTRACT_AND_QUARANTINE_RECORD
```

Mission: issue #652 under #450/#429. Produce a machine-readable fail-closed source-qualification record for EI AVIFF T2.4/T2.5. No production calculation, master publication, source-register promotion, Screening authority, or design authority is in scope.

Controlled source:

```text
reallaksh19/Common@fb549185b9b27edc2379734240320a85c5bef9f6
EI - AVIFF Guidelines 2nd Edition.pdf
blob 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
size 10348594
T2.4 Flowchart T2-2 navigation locator / printed page 55
T2.5 Flowchart T2-3 navigation locator / printed page 56
```

Observed execution blocker:
- exact binary `fetch_blob` fails in connector with `UnicodeDecodeError` because binary PDF bytes are treated as UTF-8;
- direct web retrieval of the pinned controlled PDF does not expose the page binary in this runtime.

Public searchable copies corroborate high-level branch topology only. They are uncontrolled and must remain navigation/corroboration material.

Quarantine secondary-only claims unless exact controlled page proves them, including explicit `Q <= 1.15 * Q_stall`, API 618 `Design Approach 3`, detailed machine-data/aerodynamic-field lists, and stall-frequency percentage ranges.

Additional identity finding:

```text
canonical mechanism registry: reciprocatingPulsation
T2.4 source-register entry:   reciprocatingPositiveDisplacement
status: IDENTITY_RECONCILIATION_REQUIRED
```

Do not silently mutate this discrepancy as part of a blocked source-evidence slice.

Authority freeze:

```text
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
productionRuleMaster = false
productionCalculator = false
```
