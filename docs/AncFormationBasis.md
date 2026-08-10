# ANC Formation Basis — XML→CII

The observed stiffness `9.41952E+19` is the converter constant `OPEN_END_STIFFNESS`.

Historical formation logic was:

```text
source metadata RestrainOpenEnds = Yes
AND engineering NodeNumber degree = 1
AND no explicit restraint exists at that NodeNumber
→ create RestraintSpec(type_code=1, stiffness=9.41952E+19)
→ CII ANC
```

The engineering degree was formed from the generated edge list by incrementing the `from_node.node_number` and `to_node.node_number` of every element. It did not prove that a degree-1 engineering number was a unique physical system end.

Runtime custody now adds physical-coordinate evidence before allowing that synthetic ANC. If the degree-1 node is coincident within 0.5 mm with another retained node number, it is treated as a branch/continuation occurrence and the synthetic ANC is suppressed. Explicit restraints remain authoritative.

Actual runs emit `OPEN_END_ANC_SUPPRESSED` and `OPEN_END_ANC_CREATED` records so each synthetic decision can be audited against the final CII model.
