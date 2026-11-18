# Step 10: a joined branch keeps its first pipe's full length (18 Nov 2026)

**Owner's word:** "Fix step 10" (18 Nov), after the transfer refused step 10's own EF-05 CII.

## The fault

Step 10 drops a piece of 6 mm or less, such as a 3 mm gasket. When that piece is a branch's tail, the next branch becomes an island. `_merge_coincident_orphan_nodes` then joins it by renaming its first node to the node it touches, but the renamed node kept its own position, 3 mm away. So the next branch's first pipe was written 3 mm short, and the COORDS start points disagreed with the pipe chain.

On EF-05:
- 4 of 616 pipes were 3 mm short: 10060-3089, 6400-4200, 6430-4300 and 7560-3360.
- The transfer refused with `MAP_COORDS_SEED_DRIFT` (6.8 mm at node 6380, limit 6 mm).

## The change

The renamed node now takes the position of the node it joins. The joined branch's first pipe is measured from there, so it takes the dropped length, the same as a drop inside a branch.

- `converters/scripts`, `v045/converters/scripts` and `docs/converters/scripts`: `xml_to_cii2019.py`.
- `tests/test_coincident_orphan_node_merge.py`:
  - the old "position kept" expectation now expects the joined position;
  - the node after the joint must not move;
  - a new test runs the v045 copy, the one step 10 loads.

## Checked

**EF-05, step 10 run in the browser on a local server:**
- The CII differs from main's in exactly 5 lines: the 4 pipes are 3 mm longer, and node 10060's start point is now at its XML position.
- The Enriched XML is unchanged (706f0489).
- All 616 pipes, 42 start points and 617 nodes agree with the Enriched XML to 0.01 mm.

**Transfer into step 10's Enriched XML (review page, unchanged limits of 6 mm and 1 mm):**
- no refusal;
- all 617 of 617 CII nodes paired;
- a test edit of Temperature 1 + 10 on all pipes brought back 41 of 41 branches (before the fix: 24 of 41, with the limit widened).

**Other models:**
- LAUNCHERTOPO has 9 joins (3.2 mm and 1.35 mm gaps). After the fix its pipes agree with its XML to within 0.02 mm (rounding).
- WSW-2-RE-AFC has 2 joins with a 0 mm gap, so its geometry is unchanged.

**Not done:** a 0.8 mm start-point drift that comes in at the CII v11 to v14 conversion. It is inside the limits.
