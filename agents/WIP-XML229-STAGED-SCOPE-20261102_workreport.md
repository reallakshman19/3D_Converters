# WIP-XML229-STAGED-SCOPE-20261102 — Engineering-critical native repair

## Mission / status
- User request: fix governed .cii blockage after native `XML229_STAGED_POSITION_AMBIGUOUS` (Source XML + selected staged JSON + accepted Final).
- Stacked isolated branch `fix/xml229-mandatory-staged-position-scope-20261102` based on PR379 SHA `191347659b81e5d67edd2f93ec6c3eb15ccec819`; PR379 remains draft/untouched; PR378 was live-verified **MERGED** 2026-11-02.
- Scope: correct overly broad native `dtxrPosAmbiguous` gate, so **only mandatory source-bound support ambiguity is fatal**; benign non-restraint/out-of-source-scope JSON claims remain explicitly excluded, with safe per-scope counts and mandatory-first bounded evidence.
- PROTECTED: no changes to native mass/geometry authority, staged support matching tolerance, accepted Weight Final, source aliasing, silent source-only downgrade, CII release/independent output verification.
- Actual Owner Final XML/staged source/accepted decision packet not uploaded. Original user logs have only aggregate error, 249 Final masses/1743 facts, no claim indices. No independent authorization to download governed CII.

## A1–A5 qualification / falsifiers
A1 Production trace: `_maybe_enrich_from_staged_json` in `converters/scripts/xml_to_cii2019_patched.py` calls `enrich_xml_addons` and currently raises on *any* `stats.dtxrPosAmbiguous>0`. `_position_bound_dtxr` counts all positioned staged members, including non-restraint.
A2 Isolation: `claim_scope` inside `enrich_xml_addons` already classifies in-scope supports as `MANDATORY` and non-restraint/out-of-scope entries as `NOT_APPLICABLE`, but mismatch is applied only to unmatched counts. Real synthetic XML with two coincident nodes and one untagged `EQUIPMENT` JSON at that position plus one PS-tagged SUPPORT reproduces false fatality on pre-fix.
A3 Invariant: exact PS corroboration for the true support owner remains unchanged. An untagged positioned SUPPORT with two candidate source nodes must still raise `XML229_STAGED_POSITION_AMBIGUOUS`. No hidden choice, tolerance widening or native output release.
A4 Independent validation: local Python in isolated site runtime with five synthetic cases PASS: non-restraint ambiguous excluded + valid support transferred, ambiguous SUPPORT still fails, mixed claims only mandatory fail, first 21 excluded do not hide mandatory sample, mandatory unmatched still fails. Full Owner/CI/Chromium native Final remains NOT_RUN.
A5 Minimal patch: extend `_position_bound_dtxr` with optional conflict scope/count ports; resolve `claim_scope` before matching; gate on `dtxrPosMandatoryAmbiguous` only, fallback to legacy total when source addon contract lacks new field; include bounded mandatory-only diagnostics; preserve root/docs parity; add focused Python regression tests.

## Coordination / changed files planned
- `converters/scripts/xml_to_cii2019_master_addon.py` + docs mirror
- `converters/scripts/xml_to_cii2019_patched.py` + docs mirror
- `tests/test_xml229_staged_position_scope.py` new
- Related active PR379 modifies same files: intentionally STACK on PR379, not independent main PR. PR377, PR260, PR253 adjacent authority, no edits.
- Backup each existing production module before edit; repo-mandated origin reports/tests.
- Risk: user's actual ambiguity might be mandatory, in which case this fix MUST continue to refuse and the original accepted Final basis is needed to adjudicate.

## EXACT_NEXT_ACTION
Commit scope-aware native staged position matching + test to this stacked branch; run focused checks on exact head; create a new draft PR with base `fix/xml229-candidate-preview-native-hold-20261102`. No merge or deployment.
