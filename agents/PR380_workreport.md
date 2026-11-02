# PR380 — recoverable engineering-critical native fix

## Live state / task
Draft stacked PR: https://github.com/reallakshman19/3D_Converters/pull/380
Base: PR379 `fix/xml229-candidate-preview-native-hold-20261102` at SHA `191347659b81e5d67edd2f93ec6c3eb15ccec819`.
Head before this evidence: `90e40e514a5e76a0d34013f01cf9afe8a3e9c081`. Original owner's native run failed at `STAGED_POSITION_TRANSFER` / `XML229_STAGED_POSITION_AMBIGUOUS` after ~27s despite 249 accepted physical Final masses/1743 physical facts.
PR378 has since been verified MERGED; PR379 and PR380 remain DRAFT.

## RCA / actual bounded fix
A1: native `_maybe_enrich_from_staged_json` rejected any `dtxrPosAmbiguous`, ignoring `enrich_xml_addons` preexisting `claim_scope` distinction between required support and excluded non-restraint/out-of-source claims.
A2: constructed exact coincident-geometry synthetic with unrelated EQUIPMENT at two source node positions and unique PS-tagged support. Old gate would fail for the equipment despite unique support transfer.
A3: engineering authority preserved by not changing positional candidate discovery, tag corroboration, tolerances, source topology, native mass packets, source-only selection or release verification.
A4: local equivalent native Python checks: 5/5 PASS; scope counts, unique valid PS owner, mandatory ambiguous and unmatched failure, 21 excluded first then one mandatory receipt.
A5: small producer-side per-scope count and mandatory-first bounded evidence; native stage checks `dtxrPosMandatoryAmbiguous` with legacy fallback and preserves error code when required.
Additional: corrected incorrectly escaped branch suffix regex in support scope; native transfer receipt now separately reports total, mandatory and excluded ambiguity. No original or combined source ownership mutation outside existing verified selection.

## Evidence ledger
Machine-readable evidence: `ValidationRecords/xml229-pr380-scope-qualification.json`.
- PASS local Python syntax and synthetic 5 cases, native stage invoked directly.
- PASS public EF05 XML + original public staged JSON (1.18s): 0 position ambiguities, 320 mandatory unmatched, 6840 excluded; correctly still unavailable for governed native CII.
- PASS root/docs exact byte parity for both Python modules (GitHub observed).
- CI known: Native Final to CII Mass Consumption (nonreleasing) completed success at `41380115136`; at least two other workflows failed and numerous still running. Full CI green is FALSE.
- NOT_RUN original Owner's finalized source and staged JSON with accepted 249 Final packets (not provided), real Chromium UI final workflow, independent emitted CII reconciliation, download authorization, exact-head new test in configured CI.
- No user `.cii` is claimed.

## Outstanding / risks
- The actual Owner ambiguity may involve required supports, in which case **the same refusal remains correct**. PR380 resolves only the demonstrated false-positive class.
- PR379 should be reviewed first (read-only Format Preview candidates, failed-run diagnostics, bounded claim receipt). No merging PR380 before its dependency.
- Existing `claim_scope` classification is reused; no implicit source alias or automatic approximate owner resolution.
- No source JSON or accepted Final packet was uploaded; identify actual ambiguous claim from PR379 next failed-run diagnostic.

## Exact next action
On compatible PR379+PR380 code, rerun the exact finalized Owner source/accepted Final/staged JSON and inspect `XML229.NativeStagedPositionAmbiguity.v1`. If mandatory ambiguity remains, independently map every reported staged index to a unique original source node using original branch/ordinal, exact tags and authorized transforms; never guess nearest. Then complete native output, independently reconcile all accepted physical masses and CII release. Keep drafts unmerged until owner approves.
