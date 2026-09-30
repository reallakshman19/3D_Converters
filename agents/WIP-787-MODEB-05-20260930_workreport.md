# WIP-787-MODEB-05-20260930 — Mode A/B UI integration

## Basis

```text
ISSUE = #787
PARENT = #781 / STEP-781-06
RESEQUENCE = issuecomment-5903418554
SOURCE_FREEZE_PLAN_UPDATE = issuecomment-5903460739
DEPENDENCY = PR #791 / TASK_RESULT issuecomment-5903396137
DEPENDENCY_HEAD = 54423accef618af3f98248db70290d5dd5efb718
DEPENDENCY_VALIDATED_CODE = e0cdeca1d161da21a67a7e752a3bef43ed6fa396
BRANCH = agent/issue-787-modeb-05-ui-integration-20260930
CRITICALITY = ENGINEERING_CRITICAL
PROTOCOL = V3.1 / Common@1ced68258afeaf50df113b1d38a4ceb9193587e3 / TPG-2P-2026-09-28-R3
MERGE_AUTHORITY = OWNER_ONLY_NOT_GRANTED
```

## Owned outcome

Expose explicit Mode A / Mode B product selection without replacing or weakening the existing Mode A workflow. Mode B must surface deterministic topology preparation/diagnostics and must eventually run only from source-local reviewed inputs frozen through each source's existing parity/enrichment authority.

## Current source findings

1. `xml-cii-adapted-workflow-shell-mode-a-easy-bulk-v6.js` always constructs a `createXmlCiiModeAStateRef` and installs Mode-A consolidated tools.
2. `normalizeModeABatchState()` forcibly normalizes `sourceBatch.mode` to `separate-models`; therefore Mode B selection must not overload that field.
3. The source inventory already owns multi-file enable/active state and preserves import order; Mode B can reuse this source custody rather than create another file loader.
4. Mode-A run orchestration builds source-specific execution state/config before each isolated conversion. Source-local branch maps, overrides, finalized weights and staged JSON are intentionally not global.
5. MODEB-04 `runXmlCii2019ModeBWorkflow()` materializes multiple source XMLs into one runtime job, so source-local reviewed decisions must be frozen into each source XML before composition. Applying one global branch map after composition is unsafe when Branchname values repeat across source files.
6. The qualified MODEB-04 materializer already produces deterministic topology/alias evidence suitable for a read-only UI preparation panel.

## Initial implementation boundary

- add a top-level execution-mode field, default `mode-a`, independent of `sourceBatch.mode`;
- add an explicit Mode A / Mode B selector in the source loader workspace;
- preserve existing Mode-A inventory, phase logic and run buttons when Mode A is selected;
- when Mode B is selected, show a preparation panel built from enabled source XML text through the qualified MODEB-04 preparer;
- surface canonical runtime source order, accepted/insufficient/ambiguous candidate counts, source-junction groups and accepted bridge trace;
- fail closed in UI diagnostics if preparation throws or ambiguity exists;
- do not bind the Mode B run action until source-local parity-freeze evidence is implemented and tested;
- no default promotion or production-authorization claim.

## Falsifiers / authority checks

- do not store Mode B selection in `sourceBatch.mode` because Mode-A normalization owns that field;
- do not apply combined branch mappings/overrides by raw Branchname across source namespaces;
- do not use `SYS-001_Single.xml` in runtime UI preparation;
- do not alter MODEB-01/02/03 fixtures or MODEB-04 materialization authority for UI convenience;
- if source-local parity output cannot be safely composed without a second global source-local write, stop the run binding and publish another PLAN_UPDATE rather than bypassing parity.

## Exact next action

Implement mode-state helpers and read-only Mode B source/topology review UI with runtime/docs parity and focused tests, then bind source-local parity freeze/run in a separate bounded commit once its custody contract is executable.
