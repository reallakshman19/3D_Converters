# Overall Roadmap — XML/InputXML → CII 2019 Exact-Head Closure

Maintained by the Owner. Updated **10 August 2026** after X003 physical-weight
authority closure, the historical GLRD weight dry run, and design of the
post-fix empirical weight candidate integration.

The governing engineering mandate remains
[`docs/InputxmltoCII2019Fixplan.md`](./InputxmltoCII2019Fixplan.md). Repository
source at the inspected exact head outranks this prose if they conflict.

---

## 1. Frozen authority and current heads

| Item | Authority |
|---|---|
| Repository | `reallaksh19/3D_Converters` |
| Current `main` checked during this update | `8901a226518a2745add933e8adba28e5626086db` |
| Current X003 closure implementation head before roadmap update | `85821c91f184d7b20e7839390098cf597f765c2f` |
| Current X003 closure branch before roadmap update | `agent/xml-cii-x003-weight-closure-final` |
| Governing fix plan | `docs/InputxmltoCII2019Fixplan.md` |
| Governing benchmark | `Benchmarks/XML to CII 2019/GLRD-1000-PI-01.xml` |
| Primary production target | Standalone XML/InputXML → CII 2019 workflow |
| Batch target | Mode A — multiple XML files, separate models, no model merge |
| Empirical weight specification | `docs/EmpericalWeightconceptNote.md` at `8901a226...` |
| Empirical specification blob | `e04b1d4287b1f7db06a5ae033ce6c81de2de3b5b` |
| Empirical app integration design | `docs/EmpiricalWeightAppIntegrationPlan.md` |

`main` and the stacked XML→CII branch are currently diverged. The final
integration/release candidate must reconcile the X001–X006/X003-closure stack
with the two newer `main` documentation commits; do not overwrite the completed
empirical weight specification.

Production release remains blocked until exact-checkout local qualification,
real browser qualification, independent exact-head review, and explicit Owner
authorization are complete.

---

## 2. Owner qualification policy — local only

Effective **10 August 2026**, the Owner directed:

```text
DO NOT USE GITHUB WORKFLOWS FOR GATES / CHECKING.
CHECK LOCALLY AND PROCEED SEQUENTIALLY.
```

Therefore:

1. GitHub Actions status is not qualification evidence for this workstream.
2. The authoritative repository gate is a local command executed against the
   exact checked-out SHA.
3. Browser/deployment qualification remains a separate runtime gate.
4. No workflow shall be recreated or treated as a release gate unless the Owner
   changes this policy.

Aggregate command:

```bash
node scripts/run-xml-cii-local-qualification.mjs \
  --report=artifacts/xml-cii-local-qualification.json
```

The current harness now includes the X003 physical-identity, freeze-boundary,
split-sibling migration, Final-review, and evidence-isolation regressions in
addition to X001/X002/X004/X005 checks.

---

## 3. Current phase status

| Phase | Status | Current evidence / limitation |
|---|---|---|
| P0 Baseline + expert gate | **Done** | Governing fix plan and repository-specific qualification gate established |
| P1 Runtime route / Mode A browser proof | **Open** | Source/runtime wiring exists; deployed-browser identity still not proven |
| P2 Coordinate + topology custody | **Implemented; local critical gate passed; exact-checkout aggregate pending** | X001 custody wrapper active; malformed coordinates fail closed; committed real-GLRD regression still needs exact-checkout execution |
| P3 OD / bore / property authority | **Implemented; local unit gate passed; exact GLRD aggregate pending** | X002 raw/effective OD and nominal-size authority active on stacked standalone path |
| P4 Rigid / valve / flange weight authority | **Source-level closure implemented; local critical logic passed; exact-checkout aggregate + real GLRD run pending** | WPC1 physical identity, Match1/Final separation, Final no-bypass review, source/Final precedence and split conservation implemented |
| P5 Immutable Preview / Weight evidence | **Implemented; evidence isolation strengthened; strict click-time immutable UI proof still open** | `<preview>`, `<RigidMatch1>`, `<Rigidmatch2>` retained; Match1/Final now physical-component scoped; Final evidence cannot fall back to transient compatibility map |
| P6 Enriched XML ZIP | **Implemented; local ZIP + Mode A isolation gates passed** | Deterministic per-source and Mode A packaging exists; full run-produced package needs exact-checkout execution |
| P7 Exact GLRD end-to-end qualification | **Local harness implemented; not fully executed in this environment** | Updated harness includes X003 closure tests; actual GLRD run/evidence ZIP still required |
| P8 Mode A real browser qualification | **Not started** | Requires actual browser/runtime proof with hostile duplicate cross-file names/nodes |
| P9 Independent release review / Owner authorization | **Not started** | Exact-head review + Owner release decision required |

A phase is not marked Done merely because source exists or a synthetic/static
test passes.

---

## 4. Work Pack stack and exact heads

| Mission | Branch | Exact head recorded | Status |
|---|---|---|---|
| X001 | `agent/xml-cii-x001-coordinate-topology` | `2bdf96c5c15859a5b395d20f007e51ee4131a90f` | Implemented; local/exact-checkout qualification open |
| X002 | `agent/xml-cii-x002-property-authority` | `9a387c4d2fe2a1b7c064a2e84e8286ab808415dd` | Implemented; local property gate passed |
| X003 original | `agent/xml-cii-x003-weight-authority` | `d4d4e0996f78f9f48d992dd2d6b4fcd3c45fba4d` | Superseded by closure stack for qualification |
| X004 | `agent/xml-cii-x004-evidence-snapshots` | `95dbec9add6c3fe4c6cd1f56e062233fbf7dc8b8` | Implemented; local evidence/digest gate passed |
| X005 | `agent/xml-cii-x005-evidence-zip` | `56f7f5bab68a44d5523ba40cc8af0a15c6d963f3` | Implemented; local ZIP/Mode A isolation passed |
| X006 | `agent/xml-cii-x006-local-qualification` | `7c99df62d6a1512354bb6b1ceeb8a088c1720db6` including roadmap | Local aggregate harness present; full exact-checkout execution pending |
| X003 closure | `agent/xml-cii-x003-weight-closure-final` | `85821c91f184d7b20e7839390098cf597f765c2f` before integration-plan/roadmap docs | Physical identity/lifecycle/Final-review closure implemented |
| X007 | — | — | Pending real browser qualification |
| X008 | — | — | Pending independent exact-head release review |

X002/X003 must be qualified on the stacked closure head, not on their isolated
historical branches, because standalone activation completion occurred later in
the stack.

---

## 5. X001 — coordinate / topology custody

Implemented:

- `xml_to_cii2019_coordinate_custody.py` is the standalone XML converter entry;
- missing/malformed/non-finite `Position` blocks rather than becoming origin;
- conflicting coordinates for one final CII node block beyond 0.5 mm;
- `(X,Z,-Y)` mapping remains explicit;
- deterministic `coords-mode first/all/none` behavior;
- exact converter parser-input path/digest retained.

Mandatory GLRD regression nodes:

```text
10, 760, 1200, 1640, 2080, 2520, 2960
```

Node 10 authority:

```text
source Position = 111369.76 108416.90 101088.18
CII mapping      = 111369.76, 101088.18, -108416.90
```

A local critical-function gate previously passed, but the committed real-GLRD
Python regression has not been represented as executed in this environment
because a full repository checkout could not be materialized.

---

## 6. X002 — OD / bore / property authority

Implemented:

- naked staged bore `4` is not interpreted as `4 mm`;
- explicit DN and NPS semantics are qualified; NPS 4 → DN100;
- raw `SourceOutsideDiameter` is distinct from `EffectiveOutsideDiameter`;
- FLAN/VALV/RIGID/INST endpoint discontinuities resolve only from unique
  connected-flow continuity;
- reducers/real size transitions block inappropriate neighbor propagation;
- six GLRD 60.3/26.7 flange endpoint cases are retained as regressions.

Local property tests passed; exact real-GLRD aggregate remains pending.

---

## 7. X003 — rigid / valve / flange weight authority closure

### 7.1 Historical dry-run diagnosis

With the configured `--weight-scale 10`, historical CII weights back-calculate
directly to the kilogram authority entering the writer:

| CII row | Historical N | Implied kg | Dry-run conclusion |
|---|---:|---:|---|
| 48→50 | 2987.8701 | 298.78701 | upstream accepted-mass provenance still needs real run evidence |
| 168→170 | 2760.8601 | 276.08601 | upstream accepted-mass provenance still needs real run evidence |
| 478→480 | 1207.3401 | 120.73401 | **stale/mapped authority defect proven**; visible suggestion was 15 kg |
| 529→530 | 1288.9501 | 128.89501 | **visible-suggestion mismatch proven**; supplied suggestion was 75 kg |
| 598→600 | 1207.3401 | 120.73401 | same repeated upstream authority signature |
| 678→680 | 1207.3401 | 120.73401 | same repeated upstream authority signature |
| 808→810 | 1207.3401 | 120.73401 | same repeated upstream authority signature |
| 849→10000 | 150 | 15.000 | clean negative control: 15 kg × 10 |
| 888→890 | 978.67 | 97.867 | upstream accepted-mass provenance needs real run evidence |
| 3460→3469 | 950 | 95.000 | upstream accepted-mass provenance needs real run evidence |

This dry run rules out short-element physics and the ×10 serializer scale as
the mechanism for the reported oversized rows. The defect class is upstream
mass authority / lifecycle / identity.

### 7.2 Physical decision identity

New:

```text
converters/xml-cii2019-core/weight-component-identity.js
```

Accepted weight decisions now use `WPC1` keys tied to:

```text
sourceId
branch occurrence identity
physical component group
component occurrence evidence
ComponentRefNo / fallback occurrence evidence
```

Split siblings sharing one physical `ComponentRefNo` share one physical
decision key while retaining individual occurrence IDs. Different Mode A
sources and different branches cannot collide.

Historical `branch::node` decisions are readable migration evidence only. Plain
unscoped node keys remain rejected.

### 7.3 Match1 / Final lifecycle

`weight-review-lifecycle.js` is now `xml-cii-weight-review-lifecycle/v2`.

```text
RigidMatch1 -> overrides.rigidWeightMatch1
Rigidmatch2 -> overrides.rigidWeightFinal
```

Only an explicit `rigidWeightFinal` can become Final authority. A historical
positive `rigidWeight` is demoted to Match1-compatible history; it is never
promoted to Final.

Weight Match freezes/migrates Match1 to `WPC1` identity and pins the source ID.
Final review preserves Match1 history and either:

- explicitly writes physical-component Final decisions; or
- explicitly skips Final and clears prior Final decisions for that run.

### 7.4 Final review cannot be bypassed

New:

```text
converters/xml-cii2019-core/final-weight-review-authority.js
```

Final review no longer enumerates only zero/unmapped rows. It unions candidate-
rich Weight Match rows with a source identity scan so every eligible
FLAN/VALV/RIGID/INST physical component is represented.

Important closure rules:

- positive Match1 does not hide a row;
- positive source XML `Weight` does not hide a row;
- short, zero, or unavailable element length does not hide a row;
- endpoint-1-only representation does not hide a row;
- length affects candidate quality only;
- source XML positive mass is displayed as prior evidence;
- explicit Final can overwrite an existing positive source XML weight;
- Final-review execution failure blocks conversion instead of continuing.

### 7.5 Compatibility and conservation

Physical `WPC1` decisions remain persisted authority. Immediately before the
legacy XML mutator, the workflow creates transient branch/node compatibility
keys. The source ID is recovered from pinned physical decisions so branch
filtering cannot change identity.

Parent enrichment applies the explicit reviewed override to `<Weight>` even
when source XML already has a positive weight. Standalone run parity then runs
split physical-mass conservation before Python conversion.

Conservation rules remain:

1. one positive child mass → keep once;
2. equal legacy duplicate sibling masses → collapse to one owner;
3. different positive sibling masses → review required, no guessed allocation.

The kg→N compatibility scale remains `10`.

### 7.6 X003 regression set

The local aggregate now includes:

```text
tests/xml-cii-x003-weight-authority.test.js
tests/xml-cii-x003-weight-freeze-boundaries.test.js
tests/xml-cii-x003-split-sibling-migration.test.js
```

They guard:

- Match1 vs Final authority;
- stale `rigidWeight` demotion;
- WPC1 source/branch isolation;
- split sibling legacy migration from either endpoint;
- no length or endpoint Final-review exemption;
- source XML override precedence;
- compatibility-before-conservation ordering;
- Final fail-closed behavior;
- scale 10 unchanged.

A local critical-logic harness for the new identity/lifecycle rules passed in
this session. The complete repository tests have **not** been claimed as
executed because the exact checkout remains unavailable in this environment.

### 7.7 Remaining X003 qualification work

No known source-level design gap from the historical weight RCA is intentionally
left open. Remaining work is **execution evidence**, not another guessed weight
mechanic:

1. run the updated local aggregate on an exact checkout;
2. produce a real GLRD `<RigidMatch1>` and `<Rigidmatch2>` trace;
3. confirm the historical suspect physical components now use the reviewed
   accepted mass once each;
4. retain final child allocation and CII force evidence.

Do not reopen kg→N scale or short-element physics unless new evidence points to
those mechanisms.

---

## 8. X004 — evidence and digest chain

Required case-sensitive sidecar elements remain:

```xml
<preview>...</preview>
<RigidMatch1>...</RigidMatch1>
<Rigidmatch2>...</Rigidmatch2>
```

X003 closure strengthens the evidence contract:

- Match1 is physical-component scoped;
- Final is physical-component scoped;
- `<Rigidmatch2>` uses only explicit `rigidWeightFinal` decisions and lifecycle
  disposition;
- transient compatibility `rigidWeight` cannot masquerade as Final evidence;
- explicit Final skip is distinguishable from Final acceptance.

Engine-request XML and Python converter-parse XML retain independent digests.

Still open: browser/UI proof that each snapshot is a deep immutable capture at
the exact Owner-specified click/finalization instant. Source retention at run
boundary is not by itself browser proof.

---

## 9. X005 — deterministic enriched evidence ZIP

Implemented single-source and Mode A packages include source, enriched XML,
evidence XML, exact engine input, exact converter parse input, CII, diagnostics,
topology/geometry parity, weight conservation, and manifest.

Determinism contract remains sorted STORE entries, CRC32, and fixed DOS timestamp
`1980-01-01 00:00:00`.

Mode A remains separate-model execution:

```text
crossFileTopology = false
crossFileNodeRenumbering = false
crossFilePhysicalComponentGrouping = false
```

A failed/incomplete source makes the package incomplete rather than disappearing.

---

## 10. X006 — local exact-head qualification harness

Current aggregate includes:

```text
X001 standalone route activation
X001 real GLRD coordinate regression
X002 real GLRD property regression
X003 weight lifecycle/conservation
X003 weight freeze boundaries
X003 split sibling migration
X004 evidence/digest regression
X005 deterministic ZIP
X005 Mode A ZIP isolation
production-path activation assertions
```

It records exact `git rev-parse HEAD`, child stdout/stderr/status, and final
PASS/FAIL with `executionPolicy=LOCAL_ONLY_NO_WORKFLOW`.

The full aggregate has not been represented as executed in this environment.
Direct GitHub clone/archive materialization remains unavailable here. This is a
qualification limitation, not permission to replace the local gate with
GitHub Actions.

---

## 11. Governing GLRD qualification matrix

### Coordinates

```text
10, 760, 1200, 1640, 2080, 2520, 2960
```

### Effective OD

```text
596→598
1036→1038
1476→1478
1916→1918
2356→2358
2796→2798
```

### Weight

At minimum retain machine-readable traces for:

```text
48   → 50    2987.8701 N historical
168  → 170   2760.8601 N historical
478  → 480   1207.3401 N historical
529  → 530   1288.9501 N historical
888  → 890    978.67   N historical
3460 → 3469   950      N historical
```

Required new-run chain:

```text
source physical component / WPC1
→ source mass + candidate provenance
→ RigidMatch1
→ Rigidmatch2 disposition
→ final physical mass
→ split-child allocation/conservation
→ kg→N factor
→ exact CII RIGID record
```

For any mismatch, identify the first divergent representation.

---

## 12. X007 — real browser / Mode A qualification

Still required. Source tests are not deployed-browser proof.

Retain:

```text
repository/build identity
loaded module URL/digest
multi-file UI visible
per-source state/branch selection
zero-branch blocking
source switching restoration
per-source evidence ZIP
no mergedSourceText/cross-file graph
```

Hostile case: two files may reuse Branchname and NodeNumber values because they
remain separate models; no cross-file physical-component identity or topology
may form.

---

## 13. X008 — independent release qualification

Before production authorization:

1. reconcile the final stack with exact current `main` without losing commit
   `8901a226...` empirical specification work;
2. run `scripts/run-xml-cii-local-qualification.mjs` on the exact candidate SHA;
3. run governing GLRD through the actual browser/runtime route;
4. save and inspect the evidence ZIP;
5. independently spot-check Node 10, one repeated node, one 26.7-mm case, one
   reference-named branch, `478→480`, `529→530`, one restraint, and one hostile
   two-source Mode A case;
6. confirm unrelated converters did not regress;
7. record the exact qualified SHA;
8. obtain explicit Owner production authorization.

---

## 14. Post-fix empirical weight candidate integration

Governing specification:

```text
docs/EmpericalWeightconceptNote.md
commit 8901a226518a2745add933e8adba28e5626086db
blob   e04b1d4287b1f7db06a5ae033ce6c81de2de3b5b
```

Detailed application design:

```text
docs/EmpiricalWeightAppIntegrationPlan.md
```

The empirical basis is **candidate generation, never accepted-weight authority**.

Runtime route shall remain:

```text
EXACT → A2_MATRIX → A1_SIZE_BAND → EXTRAPOLATED
```

with the specification's confidence classes and missing-predictor
renormalization.

Recommended module ownership:

```text
empirical-weight-model-decoder.js
empirical-weight-predictor.js
empirical-weight-candidate-adapter.js
```

The predictor returns weight + route + confidence + model/payload provenance and
attaches it to the same `WPC1` physical component. It may populate a visible
Weight Match candidate; it may not directly write Match1, Final, XML Weight, or
CII force.

This enhancement is intentionally **not mixed into X003 defect closure**. It is
design-only until the X003/X006 exact-checkout gate passes and the closure stack
is reconciled with `main` so the verified empirical specification is present on
the same candidate head.

---

## 15. Governing engineering decisions

Unless the Owner changes them explicitly:

1. occurrence/physical-component identity outranks engineering NodeNumber;
2. raw source properties remain evidence; effective CII properties require
   explicit component/flow-path authority;
3. nominal-size units are explicit;
4. `RigidMatch1` and `Rigidmatch2` are separate decisions;
5. only explicit Final acceptance creates `rigidWeightFinal`;
6. positive source/Match1 mass never bypasses Final review;
7. length is candidate evidence, not a Final-review exemption;
8. physical-component mass is conserved across split/generated children;
9. a large mass on a short rigid is not automatically wrong;
10. malformed/unknown engineering values fail closed;
11. engine-request and converter-parse XML are distinct retained facts;
12. Mode A never merges physical-component identity across source files;
13. empirical prediction is a candidate source, not hidden accepted authority;
14. GitHub workflows are not qualification gates for this workstream.

---

## 16. Immediate next action

On a normal local checkout of the current closure branch:

```bash
git checkout agent/xml-cii-x003-weight-closure-final
git rev-parse HEAD
node scripts/run-xml-cii-local-qualification.mjs \
  --report=artifacts/xml-cii-local-qualification.json
```

Inspect every child test stdout/stderr and retain the report.

If the aggregate passes:

1. run the real GLRD and inspect the new physical Match1/Final/conservation/CII
   weight traces, especially `478→480` and `529→530`;
2. reconcile the stack with current `main` and verify the empirical spec blob;
3. only then implement the empirical candidate engine as a separate enhancement;
4. run X007 browser qualification on whichever functionality is intended for
   the release candidate.

Do not substitute Actions, source presence, or a dry run for the exact-checkout
and browser gates.
