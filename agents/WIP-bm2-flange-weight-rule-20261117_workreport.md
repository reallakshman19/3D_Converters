# WIP-bm2-flange-weight-rule-20261117 — CII writer: blind-flange and both-ends flange weights (Owner rule, 17 Nov 2026)

## Mission and scope
Owner, 17 Nov 2026: "Add to flange, once". Today's CII writer refused the BM2 transfer test file
(CII_WEIGHT_OWNER_UNRESOLVED, 8 of 218 rigid weights, 204.9 kg). Rule:
1. Blind flange: a weighted RIGID right after a flange end 2, with the blind (FBLI) between them, within 5 mm, and no
   CII element of its own: its weight is added to that flange's rigid element (moves at most 3.2 mm).
2. Flange weight on both ends (end 1 repeats end 2, same flange): written once, on the flange's element; when that
   element is not rigid in the CII (end 2 not Rigid=2) it becomes rigid.
Everything else stays refused. The rule runs only when the owner check would refuse, so a model that wrote a CII before
writes the same bytes. Not applied on the xml229 native-final path (its own mass proof).
Files: converters/scripts/xml_cii_weight_output_custody.py (+docs mirror), xml_to_cii2019_runtime_custody.py (+docs mirror),
tests/xml-cii-flange-weight-rule.test.py. The writer logs each use as `CII_WEIGHT_RULE <rule> <branch>::<node> <kg> -> CII element a-b`.

## What the 11 Nov CAESAR II file did (BM2 source CII)
One weight per flange; the 6 blind-flange weights (146.5 kg) were not in it. Both-ends flanges written once (3380-3390 rigid 29.422 kg).

## Validation
| Check | Status | Observation |
|---|---|---|
| BM2 base and transfer-protected XML, CLI | PASS | CII written; 8 CII_WEIGHT_RULE lines; 310-319 118 kg, 1040-1049 etc 34.499 kg, 3370-3379 29 kg once, 3380-3390 rigid 29.422 kg |
| BM2 mass | PASS | CII rigid total 12,424.9 kg = XML Rigid=2 total 12,453.9 kg less the one 29 kg duplicate |
| EF-05 enriched-3, CLI | PASS | CII SHA identical before and after |
| tests/xml-cii-flange-weight-rule.test.py (new) | PASS | blind moved; no blind or 8 mm gap not moved; both ends once; different end weights refused |
| tests/xml-cii-weight-owner-guard.test.py, xml229 native mass/cardinality, 781 restraint, 776/781 JS | PASS | |
| tests/xml-cii-runtime-custody.test.py, xml-cii-weighted-geometry.test.py, xml-cii-runtime-custody-static.test.js | FAIL, pre-existing | fail identically on main without this change |
NOT RUN: the "becomes rigid" path in a synthetic test (covered by BM2 only); a live browser Run of BM2.

## EXACT_NEXT_ACTION
Draft PR. Owner merge word; then a live Run of the BM2 file in step 10.
