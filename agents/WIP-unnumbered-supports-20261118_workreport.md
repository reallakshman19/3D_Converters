# Work report: step 10 writes the supports on unnumbered nodes (18 Nov 2026)

**Owner's word:** "Fix the -2 supports" (18 Nov 21:5x).

## What was wrong (measured)

- Raw EF-05 has 11 unnamed ATTA points numbered -2, with no supports.
- Step 10's ATTA default gives each one a +Y, so step 10's Enriched XML has 173 restraints.
- The CII writer (`v045/converters/scripts/xml_to_cii2019.py`, the copy step 10 loads) skips every node numbered 0 or less, so their supports were dropped silently. The CII had 162 model supports.
- Placement in EF-05:
  - 10 of the 11 points sit exactly (0 mm) on a numbered node of the same branch: 910, 1500, 2110, 2710, 4650, 4760, 5990, 6650, 7020 and 7700. None of these had a support.
  - 1 sits at the far end of bend 800, on the bend's unnumbered far tangent point, with no numbered node within 5 mm.

## The change

- `xml_to_cii2019.py`: an unnumbered node's supports go to a numbered node in the same branch:
  - the one at the same point (within 1 mm, nearest, ties to the one before);
  - else, at a bend's far end, the bend's own node, because CAESAR II puts a bend's To node at the end of the bend;
  - a node with its own supports keeps them, and the moved ones are added (`_merge_restraint_specs`, as for a dropped short piece);
  - otherwise they are listed as not written.
- `xml_to_cii2019_runtime_custody.py` (step 10's entry): run-log lines `UNNUMBERED_SUPPORT_PLACED …` and `UNNUMBERED_SUPPORT_NOT_WRITTEN …`.
- `tests/test_unnumbered_restraint_placement.py`: 5/5 pass (same point, bend end, own support kept, nowhere to go, control). Against main's writer it fails, as it should.
- The root `converters/scripts` and `docs/` copies are not changed. They already differ from `v045`, and step 10 does not load them.

## Checks (my runs)

| Check | Result |
|---|---|
| Step 10's EF-05 Enriched XML (706f0489) through the writer | 173 model supports (was 162). Only nodes 800, 910, 1500, 2110, 2710, 4650, 4760, 5990, 6650, 7020 and 7700 differ, each now +Y 1.7513E+12. Every other line differs only in the restraint pointer column (192 → 203). |
| No unnumbered supports: BM2 step 10 Enriched, BM2 fixture base, raw EF-05, Launcher, WSW | CII byte-equal to main's writer |
| Full step 10 in the browser, raw EF-05 (local server) | ok, 11 `UNNUMBERED_SUPPORT_PLACED` lines, CII f514e024 (was 045918b3) |
| Full step 10, section 5's EF-05 support-edits final XML | ok, 203 restraints, the transferred supports are still kept |
| 22 writer test files in `v045/converters/scripts` | Same exit codes on main and the fix; 5 files fail on both |

## Note for the XCU side

The EF-05 fixtures in XML_Compare_Utilities were made with the old step 10. Their "11 supports in the XML that step 10 does not write" line stays true for those fixed files. A new step 10 CII would show 0.
