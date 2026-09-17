# WIP-769-v25-postmerge-repair

## Purpose

Issue #769 post-merge repair under `engineering-pr-delivery-v2.5`.

## Current state

- Branch: `agent/issue-769-postmerge-repair-20260917`
- Main/base observed: `9f0925454652cd963364c066c2bb7b8828275afd`
- Pre-repair/material basis: `57fb8105885e6f7693b203da9951ca1aae66dbee`
- Current serial frontier: `WP-769-FBLI`
- Active EP: `EP-769-01`
- Owner write qualification: `ODR-769-0002` — `qualified for write, proceed next`
- Candidate admission: `DISC-769-01` / `QUAL-769-01` / `TC-769-01`
- Production repair commit: `7e534211b9f68faa663cf70b02a59c540e184f60`
- Focused regression commits: `07609a462c9ca13a5743e6ae0ac9c084242a3aaf`, strengthened by `92360d5de50234091278c5d5609e75fadc3e347c`
- Draft delivery PR: #772, open and mergeable at last GitHub readback
- Current material authority: READ_ONLY pending required Python validation
- Open PR #417 coordinate/topology scope remains protected and excluded.

## RCA boundary and implementation

The pre-fix wrapper admitted only raw `FLAN` and `RIGID` to length-bearing negative-node renumbering. The reported blind flange `FBLI` with `NodeNumber=-1` therefore remained negative and was discarded by the base parser's `node_number <= 0` gate before model creation.

The repair is at that owning boundary:

- explicit negative-node component-family classification;
- `FLAN` and `FBLI` resolve to `FLANGE_FAMILY`;
- `RIGID` preserves its existing eligible family;
- unrelated component types return no family and remain fail-closed;
- the existing `ElementLengthMm > 0`, positive-neighbor, uniqueness, and fallback-node assignment logic is unchanged.

The production commit is a 12-addition / 2-deletion patch in `converters/scripts/xml_to_cii2019_patched.py` only. No PR #417 path is changed.

## Focused regression contract

`converters/scripts/test_xml_to_cii2019_fbli_negative_node.py` covers:

- taxonomy: `FLAN -> FLANGE_FAMILY`, `FBLI -> FLANGE_FAMILY`, `RIGID -> RIGID`, `INST -> None`;
- eligible negative-node renumbering for FBLI / FLAN / RIGID;
- negative `INST` remains unrenumbered;
- zero-length FBLI remains fail-closed;
- the reported `FBLI`, `NodeNumber=-1`, `Endpoint=1`, `OD=168.3`, position `111348.13 107175.33 100916.75` survives enrichment and positive-node parsing;
- the retained FBLI is present in the actual conversion model edge set.

A source-level downstream audit found one base `FLAN`-specific rigid-index condition (`from_node.rigid == 2` followed by `FLAN`). The reported FBLI record has `Weight=0` and no rigid flag, so that special rigid-index condition is not the demonstrated loss boundary and is not changed in this EP.

## Validation truth

- `TEST-SCOPE`: PASS — PR #772 changed-file inventory has no intersection with PR #417 changed paths.
- `TEST-FBLI`: NOT_RUN — prescribed command requires an executable private checkout; no matching GitHub workflow ran for this branch/PR.
- `TEST-LEGACY`: NOT_RUN — same environment/tooling boundary.
- GitHub commit status contexts: none observed for the engineering test head.
- GitHub push workflow runs for this branch: zero observed.
- GitHub pull-request workflow runs for PR #772: zero observed.
- Quality review: `QRV-769-01` = NEEDS_ATTENTION solely because the testing procedure is NOT_RUN; code/design/scope/delivery review is clear.
- No behavioral pytest PASS is claimed.

## Historical benchmark ledger

- BM-001 PASS
- BM-002 PARTIAL_PASS_SCALE_PATH
- BM-003 PASS
- BM-004 NOT_RUN_ENVIRONMENT_BLOCKED
- BM-005 PARTIAL_PASS_11K
- BM-006 PASS
- BM-007 PASS
- BM-008 PASS
- BM-009 NOT_RUN_ENVIRONMENT_BLOCKED

## Progress

`AC-SCOPE-01` is complete. `AC-FBLI-01` and `AC-FBLI-02` remain NOT_RUN because their mandatory tests have not executed. The serial roadmap therefore remains on `WP-769-FBLI`; `WP-769-GEOMETRY` is not opened by this work.

## Exact next action

Run:

```text
python -m pytest -q converters/scripts/test_xml_to_cii2019_fbli_negative_node.py
python -m pytest -q converters/scripts/test_xml_to_cii2019_patched_process.py
```

in an executable checkout or authorized validation carrier. If both pass, complete the quality/checkpoint reconciliation for `WP-769-FBLI` and compute the next serial frontier. If either fails, repair only the demonstrated failure boundary under the current EP.

## Merge authority

OWNER_ONLY. PR #772 is draft and no merge is authorized by this WIP record.
