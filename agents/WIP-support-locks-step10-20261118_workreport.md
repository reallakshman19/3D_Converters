# Work report: support locks in step 10, step 3 (18 Nov 2026)

**Owner's words:** "Support locks in step 10" (18:3x), then "yes start" for step 3 (21:1x).
**Plan:** topofix-agents `roadmap/UXML-SUPPORT-LOCKS-STEP10-PLAN.md`, step 3 (3D_Converters takes it) and step 4 (the round trip through the full step 10).

## What changed for the user

When a transfer from CAESAR II has added, removed or edited a support, step 10 now keeps that support. Before this change, step 10's default-support steps put back a support that CAESAR II had removed (EF-05 node 90).

## Files

- `vendor/uxml-v2/` re-vendored from XML_Compare_Utilities main 870c7daf (`node scripts/vendor-uxml-v2.mjs <XCU checkout>`; the checkout was clean under uxml/v2). The changes are `supports/SupportsStage.js`, the new `supports/process/TransferSupportsKeep.js` and `PIN.json`.
- `v045/tabs/xml-cii-2019-standalone/xml-cii-uxml-route.js`: names the new pin, and puts the stage's own line ("n node(s) keep the supports transferred from CAESAR II") into the run log.
- `v045/tabs/xml-cii-2019-standalone/xml-cii-standalone-run-parity-mds-restraints.js`: the route used when "UXML route" is unticked gets the same rule (the vendored module), after the MDS closure, which is its last restraint step. Parity is re-checked afterwards. The protection note is carried again, because the keep writes plain XML, which has no comments.
- `tests/xml-cii-transfer-supports-keep.test.mjs` (new), 5 of 5 pass:
  - control: without the note, the route puts a LIM on node 20;
  - the note names node 20 and CAESAR II has no support there: node 20 stays without one, the log line is written, and the note is kept;
  - CAESAR II has +Y on node 20: exactly that +Y is kept;
  - today's note without `supports` gives the same XML as no note;
  - a node that is not there is reported, and nothing else changes.

## Checks run (my runs, not acceptance)

All runs used the local server (topofix-root :8781) with full step 10 (`runXmlCii2019Workflow`, outputMode both). The input was section 5's final XML for the EF-05 support-edits sample, made on the local review page at XCU main 870c7daf. Its note lists 41 branches and the supports on nodes 50, 90 and 240.

| Check | Result |
|---|---|
| CAESAR II file, UXML route ticked | node 90 has no support, node 50 is +Y at 2E+12, node 240 has the GUI. Compared with the edited CII, only node 99999 differs (refused by the transfer). |
| Run log | "1 node(s) keep the supports transferred from CAESAR II", in both routes. |
| Unticked = ticked | The CII is byte-equal (ff2ffa2e…). |
| No note, same as today | EF-05 benchmark CII 045918b3 (= today's live). BM2 (`fixtures/uxml-v2-transfer/BM2/base.xml`) CII 4a939aa9 (= this morning's run on main). |
| Temperatures | 616 of 616 elements keep Temperature 1 = 130, as in the edited CII. |
| Control: final XML without the note | node 90's +Y comes back, and the temperatures go back to 120, so the checks above are not empty. |

**Related tests:** 13 files, 105 tests: 104 pass and 1 fails. The failing test ("deployed UI chain selects the fresh restraint-closure runner") reads only root `tabs/` files, which are the same as main's; I did not run it on main.

## Not in this change

- The 11 EF-05 supports on ATTA nodes numbered -2, which step 10 never writes.
- Seen in passing: the Enriched XML download that step 10 writes has no protection note. I did not check whether main does the same; it is a note for later.
