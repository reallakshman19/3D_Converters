# WIP — KD320 Q1 Formal Exit Intake + Combined Package Preview

## Recovery header
- WORK_INTENT: IMPLEMENT
- CRITICALITY: ENGINEERING_CRITICAL
- BRANCH: `agent/hp-kd320-q1-package-preview`
- BASE: `main@7f7ce459c8f059b503b045bbdebbe10d303b1044`
- PREDECESSOR: PR666 merged at base SHA.
- BACKUP: `backup/hp-kd320-q1-package-preview-pre-edit-20260819`
- MODE: AUTO
- MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED_FOR_SUCCESSOR
- PRODUCTION_KERNEL_CHANGED: NO
- LICENSED_SOURCE_CONTENT_ALLOWED: NO

## Mission
Keep the four existing top-level KD320 record classes unchanged and add the missing `CONTROLLED_SOURCE` formal-Q1-exit sub-package plus a combined browser-memory Q1 package preview.

Required joined gate:

```text
2 verified controlled-source receipts
+ 14 independently checked semantic records
+ formal Q1 exit attestation bound to receipt hashes / semantic locators+opaque refs
+ E01-E08 exact PASS refs
+ G0/G1 exact PASS refs
+ evidence-ledger SHA-256 + audit-report SHA-256
+ distinct attestor/checker
-> Q1 complete / Q2 oracle pending
```

## Authority boundary
`USER_CALCULATED_KD3` remains the production route. Native KD320 qualification, Code compliance, design authority, production kernel permission and automatic promotion remain false.

## Initial gap
After PR666, `tabs/hp-kd320-evidence-intake-tab.js` previews receipt CSV and semantic CSV independently, but provides no formal-exit attestation intake and no joined Q1 evaluation. Therefore the UI cannot reach the formal Q1 completion state even with valid controlled evidence.

## Planned files
- new Q1 package-preview adapter
- Q1 package regression tests
- KD320 evidence intake UI wiring
- UI/static regression update
- engineering workspace cache-bust only if UI module changes
- WIP/PR recovery files

## Validation policy
PASS/FAIL/NOT_RUN must remain explicit. No native KD320 engineering calculation will be introduced or claimed.
