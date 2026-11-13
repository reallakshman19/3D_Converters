# X3 — Mode B evidence seal, review fixes (Rule 8)

Branch: `fix/x3-20261112`
Base: `dc495686d825c9651b1ca687b90e1a49c71be37b`
Review parent: `c53afd2c165dd2425fdde51e7c9f4383c8ab91e8`
Review: fresh Opus PASS 88/100, no HIGH. Owner authorized the following bounded review fixes.

## Scope and validation
- PASS — Missing/partial Mode B source rows (including the pre-X3 v1 package) refuse with `MODE_B_STAGED_SOURCES_ABSENT`, before the aggregate digest comparison can obscure the missing-row diagnosis. T7 and T16.
- PASS — Missing session records retain `MODE_B_STAGED_JSON_MISSING` and offer a hint to check whether the session Mode B config changed after this Run. T18 drives the actual UI adapter that drops stale records.
- PASS — Session source IDs absent from the package refuse with `MODE_B_STAGED_SOURCE_UNKNOWN`, including extra records supplied for non-Mode-B packages. T17. T10 now supplies only the applicable single-source session.
- PASS — The previous privacy and run-bound custody rules remain: per-source records contain only sourceId, fileName, minNode, maxNode, UTF-8 byteLength and sha256; no raw staged JSON in new exports. No changes to converter engineering output or mass approval.
- PASS — Syntax checks; existing root/docs workflow-service and output-run mirrors remain byte-identical. No counterpart of the changed v045 frozen-run package exists under root/docs.
- NOT RUN — Browser checks (Oracle responsibility). No new independent review claimed.

## Test evidence

| Suite | Revised | Review parent with revised tests | Main with revised tests |
| --- | ---: | ---: | ---: |
| X3 T1–T18 | 18/18 | 14/18 | 0/18 |
| Mode B isolation | 3/3 | 3/3 | 3/3 |
| Mode B staged per source | 5/5 | 5/5 | 5/5 |
| Python island isolation | 7/7 | 7/7 (previous verified run, unchanged suite and Python code) | 7/7 |
| Total | 33/33 | 29/33 | 15/33 |

Node v22.16.0; executed on the supplied exact-base archive with the prior patches applied. The two changed JS/test blobs were checked against the connector branch versions before editing. T7, T16, T17 and T18 fail on the review parent with the revised tests; all 18 X3 tests fail on main, and there are no pre-existing regression failures. Tests use invented data only.

Commands:
```sh
node --test tests/x3.test.mjs tests/xml-cii-mode-b-isolation.test.mjs tests/xml-cii-mode-b-staged-per-source.test.mjs
python -m unittest tests.test_mode_b_island_isolation
```

## Limits (explicit)
Package hashes are self-contained and unsigned. A party editing a package can recompute its hashes; the seal is an integrity and consistency check, not a cryptographic signature or proof of origin/authenticity. Independent session-held staged data still has to match the recorded per-source metadata. Existing enriched XML, CII and support configuration can contain derived engineering values; excluding raw staged JSON does not remove those values. The package does not approve physical mass or assert historical replay.

## Changed-file ledger
- `v045/tabs/xml-cii-2019-standalone/xml-cii-frozen-run-package.js`: named refusal and session checks; tested blob `67cc5df26e8d5fc9fd47943834eddd9b107e17c5`.
- `tests/x3.test.mjs`: revised T7/T10 and new T16–T18; tested blob `71423e92f864b6d5d2559096d588bd4b250c4f7e`.
- This report.

EXACT_NEXT_ACTION: Oracle reviews the single follow-up commit on the same branch and runs browser verification. No PR, merge, force push, deployment or X4/X5 work authorized.
