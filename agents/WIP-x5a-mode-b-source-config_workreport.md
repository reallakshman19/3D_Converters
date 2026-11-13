# X5a — Mode B source configuration capture (Rule 8 work report)

Branch: `fix/x5a-20261113`  
Base: `4e95b2ed7241e5b253bb9860bd31663158a69ba9` (explicit card base; not the subsequently advanced main).  
Classification: engineering-critical conversion workflow custody; disclosure only, no engineering remapping.  
Status: implementation and local verification complete; independent Oracle/browser review pending.

## Scope and decisions
- Capture the effective supportConfigJson of each enabled source's execution row before the Mode B-to-Single transition. The existing source-order manifest schema remains xml-node-offset-combine/v1, with sourceConfigVersion: 1. Each sourceConfig contains only overrides, branchLineKeyMap, finalizedMatches and sha256.
- Stable SHA-256 uses UTF-8 JSON.stringify of the three-key payload, recursively sorted object keys and preserved array order, excluding sha256 itself. Reuse the existing synchronous browser-compatible hash implementation. Missing keys become {}, {}, []; invalid JSON or wrong container shape is refused with MODE_B_SOURCE_CONFIG_INVALID rather than silently discarded.
- The notice and diagnostics share one formatter. Counts are top-level override buckets, individual branch mapping entries and finalized-match rows, respectively. Include source ordinal, ID and file name (even zero-count sources when another source has data). Display the notice on combine and on the combined Single loader; clear it when empty/stale. Append a warning string and structured diagnostics.modeBSourceConfigNotApplied on returned Run results. Existing warnings are retained. Errors thrown before a Run result is constructed continue to follow the existing API error path.
- The captured values are never merged into the effective converter configuration. commonModeASupportConfig remains unchanged. X5b/X5c remapping, manual-fact remapping, weight authority and conversion semantics are out of scope. The existing X3 staged-data privacy and X4 restraint conservation gates are retained.
- A legacy manifest lacking X5a sourceConfigVersion/sourceConfig still works if it satisfies the pre-existing X4 requirements. No relaxation of the X4 refusal for manifests without restraint inventory.
- No new dependencies or Owner data used. Tests use only invented PSI116 inputs.
- Import versions use 20261113-x5a-1 through the reverse production dependency chain, including app/index entry points; version-only changes account for most files. Three prior static-version tests were adjusted only for superseded links. Root/docs matching mirrors remain byte-identical. Two intentionally different pre-existing root/docs deployment modules (xml-cii-adapted-events-mode-a.js and xml-cii-adapted-workflow-shell-mode-a-easy-bulk-v6.js) retain their distinct non-X5a content while their import links are updated; forcing them equal would change unrelated deployment behavior.
- The archive was the earlier base; critical X3/X4 inputs were reconstructed from the connector-pinned base and checked against Git blob IDs. The final remote tree is constructed from the exact pinned parent, not a synthetic snapshot. All 141 changed production/test paths matched the tested local path/blob inventory fingerprint (a0277a17); individual functional and test blob IDs were also checked. No deletion.

## Test evidence
| Gate | Result |
|---|---|
| T1 enabled-source capture, excluded fields, stable independent SHA-256 | PASS |
| T2 empty config/no notice or warning, ordinary Single reset | PASS |
| T3 visible-notice state and exact counts on root and v045 Run results | PASS |
| T4 legacy X4 manifest without X5a fields | PASS |
| T5 equal XML, effective converter configuration and native CII bytes (root and v045) | PASS |
| T6 import-chain versions and existing matching docs mirrors | PASS |
| M1 remove sourceConfig capture: T1 fails | RED as required |
| M2 remove Run warning: T3 fails | RED as required |

Node suite: 99/101 PASS including 6/6 X5a; existing suites 93/95 PASS on both reconstructed pinned base and revised code. Python island isolation: 7/7 PASS. Total revised 106/108, two inherited failures; no new failures. git diff --check PASS. Mutations reverted before final suite.
Commands:
```sh
node --test tests/x5a.test.mjs tests/x3.test.mjs tests/x4.test.mjs tests/xml-cii-mode-b-isolation.test.mjs tests/xml-cii-mode-b-staged-per-source.test.mjs tests/xml-cii-mode-b-parity-node-custody.test.mjs tests/xml-cii-mode-b-preview-occurrence.test.mjs
python -m unittest tests.test_mode_b_island_isolation
```
T5 uses an independent expected combined XML literal, legacy-manifest equivalent without capture, the real Python converters for CII, and an explicit identity parity adapter. It does not claim full browser/Pyodide end-to-end parity or production-model qualification. UI notice state is exercised in Node; actual browser rendering is reserved for Oracle.

## Old failures (reproduced on the pinned base)
- X3 T12 workflow service carries the Run seal into a frozen export: fixture lacks the manifest now required by X4; MODE_B_RESTRAINT_NOT_CONSERVED.
- X4 R1.5 production version/mirror check: v045 xml-cii-adapted-final-rigid-review.js imports xml-cii-workflow-ui-adapter.js without its X4 query token (X3 integration). Neither failure is changed or waived by X5a.

## Limits
The SHA is stable evidence, not a signature or externally authenticated seal; a modified manifest can recompute it. No load-time hash verification is added in X5a. Only the requested three keys are retained; the separately transported manual restraint facts are not captured or applied by this card. Manifest export contains the requested configuration values and should be handled as source-sensitive engineering data. Raw staged JSON and master rows are not separately captured. Counts do not imply valid or applied engineering edits.

EXACT_NEXT_ACTION: Oracle reviews this single commit, runs the full pinned checkout and browser notice/Run verification, then decides acceptance. Resolve inherited regression failures separately. No main push, PR, merge, force push, deployment, or X5b/X5c changes.
