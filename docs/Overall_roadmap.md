# Overall Roadmap — XML/InputXML → CII 2019 Exact-Head Closure

Maintained by the Owner. Updated **10 August 2026** after implementation of
Work Packs X001–X005 and creation of the local-only X006 qualification harness.

The governing engineering mandate remains
[`docs/InputxmltoCII2019Fixplan.md`](./InputxmltoCII2019Fixplan.md). This roadmap
records implementation sequence, exact branch heads, qualification state, known
limitations, and the next authorized action. Repository source outranks this
prose if they conflict.

---

## 1. Frozen authority

| Item | Authority |
|---|---|
| Repository | `reallaksh19/3D_Converters` |
| Current `main` checked during this update | `9bd60db7b013ff7e1aaaadf661bf84b977f42643` |
| Governing fix plan | `docs/InputxmltoCII2019Fixplan.md` |
| Governing benchmark | `Benchmarks/XML to CII 2019/GLRD-1000-PI-01.xml` |
| Primary production target | Standalone XML/InputXML → CII 2019 workflow |
| Batch target | Mode A — multiple XML files, separate models, no model merge |

Production release remains blocked until X007/X008 are qualified and the Owner
explicitly authorizes release.

---

## 2. Owner qualification policy — local only

Effective **10 August 2026**, the Owner directed:

```text
DO NOT USE GITHUB WORKFLOWS FOR GATES / CHECKING.
CHECK LOCALLY AND PROCEED SEQUENTIALLY.
```

Therefore:

1. GitHub Actions status is **not** qualification evidence for this workstream.
2. A workflow being green, red, queued, billing-blocked, or never started shall
   not change a Work Pack status.
3. The authoritative repository gate is a local command executed against the
   exact checked-out SHA.
4. The X001 qualification workflow has been removed from the X001 branch and
   from the current stacked qualification branch.
5. Browser/deployment qualification in X007 is still required, but it is a
   runtime/browser proof, not a GitHub workflow gate.

The aggregate local command introduced by X006 is:

```bash
node scripts/run-xml-cii-local-qualification.mjs \
  --report=artifacts/xml-cii-local-qualification.json
```

It invokes repository tests directly with Node/Python and does not invoke
GitHub or Actions.

---

## 3. Current phase status

| Phase | Status | Current evidence / limitation |
|---|---|---|
| P0 Baseline + expert gate | **Done** | Governing fix plan and repository-specific qualification gate established |
| P1 Runtime route / Mode A browser proof | **Open** | Source/runtime wiring exists; deployed-browser identity still not proven |
| P2 Coordinate + topology custody | **Implemented; local critical gate passed; exact-checkout aggregate pending** | X001 wrapper active; malformed coordinates fail closed; full committed GLRD regression still needs execution from a materialized checkout |
| P3 OD / bore / property authority | **Implemented; local unit gate passed; exact GLRD aggregate pending** | X002 code + real-GLRD regression committed; X002 standalone activation completed on later stacked head |
| P4 Rigid / valve / flange weight authority | **Implemented; local unit gate passed; end-to-end GLRD weight provenance still open** | Review lifecycle separated and split mass conserved; branch::node persistence is safer but not yet a full component-occurrence identifier |
| P5 Immutable Preview / Weight evidence | **Implemented; local digest/evidence gate passed; strict UI freeze-point review still open** | Required tags/digests exist in sidecar; snapshots are built from retained lifecycle state at run boundary, not yet proven as click-time immutable deep copies |
| P6 Enriched XML ZIP | **Implemented; local ZIP + Mode A isolation gates passed** | Deterministic per-source and Mode A packaging exists; full run-produced package still needs exact-checkout execution |
| P7 Exact GLRD end-to-end qualification | **Local harness implemented; not yet fully executed in this environment** | X006 runner aggregates X001–X005 tests; full browser-style GLRD weight/review trace remains a qualification requirement |
| P8 Mode A real browser qualification | **Not started** | Requires actual browser/runtime proof with duplicate cross-file names/nodes |
| P9 Independent release review / Owner authorization | **Not started** | Exact-head review + Owner release decision required |

A phase is not marked Done merely because source exists or a synthetic test
passes.

---

## 4. Work Pack stack and exact heads

The implementation was deliberately kept as stacked branches so each mechanic
could be reviewed separately.

| Mission | Branch | Exact head recorded | Status |
|---|---|---|---|
| X001 | `agent/xml-cii-x001-coordinate-topology` | `2bdf96c5c15859a5b395d20f007e51ee4131a90f` | Implemented; workflow gate removed; local/exact-checkout qualification open |
| X002 | `agent/xml-cii-x002-property-authority` | `9a387c4d2fe2a1b7c064a2e84e8286ab808415dd` | Implemented; local property gate passed |
| X003 | `agent/xml-cii-x003-weight-authority` | `d4d4e0996f78f9f48d992dd2d6b4fcd3c45fba4d` | Implemented; local lifecycle/conservation gate passed |
| X004 | `agent/xml-cii-x004-evidence-snapshots` | `95dbec9add6c3fe4c6cd1f56e062233fbf7dc8b8` | Implemented; local evidence/digest gate passed |
| X005 | `agent/xml-cii-x005-evidence-zip` | `56f7f5bab68a44d5523ba40cc8af0a15c6d963f3` | Implemented; local ZIP and Mode A isolation gates passed |
| X006 | `agent/xml-cii-x006-local-qualification` | `f0bcc0819fc3b61b12e5d96a26300163878f7647` before this roadmap commit | Local aggregate harness present; full aggregate execution pending |
| X007 | — | — | Pending real browser qualification |
| X008 | — | — | Pending independent exact-head release review |

### Important stacked-head note

During X005 custody tracing, a production-path activation gap was found:
X002 staged-geometry/effective-OD authority and X003 split-weight conservation
were not both being called by the standalone run-parity path. That gap was
fixed on the stacked X005 lineage by activating:

```text
applyXmlCiiStagedGeometryAuthority
applyXmlCiiOutsideDiameterResolver
applyXmlCiiSplitRigidWeightPropagation
```

before engine release. Consequently, X002/X003 should be qualified on the
current stacked X006 head, not by testing their isolated branch alone.

---

## 5. X001 — coordinate / topology custody

### Implemented

- Added `converters/scripts/xml_to_cii2019_coordinate_custody.py`.
- Standalone invocation now uses the coordinate-custody wrapper rather than
  bypassing the stronger contracted PSI116 topology layer.
- Missing/malformed/non-finite `Position` values block conversion instead of
  becoming `(0,0,0)`.
- One final CII `NodeNumber` may not represent physically conflicting
  coordinates beyond the existing 0.5 mm topology tolerance.
- `coords-mode=first` writes deterministic absolute anchors for branch starts.
- `coords-mode=all` is deterministic; `none` remains explicit.
- Exact Python parser-input path/digest markers are also emitted for later
  evidence packaging.

### Mandatory GLRD regression

```text
10, 760, 1200, 1640, 2080, 2520, 2960
```

Node 10 authority remains:

```text
source Position = 111369.76 108416.90 101088.18
CII mapping      = 111369.76, 101088.18, -108416.90
```

### Local evidence actually executed in this session

A local critical-function gate confirmed:

- the Node 10 `(X,Z,-Y)` mapping;
- coincident reuse of Node 760 is allowed;
- conflicting reuse of one CII node blocks with
  `CII_NODE_POSITION_CONFLICT`;
- nonnumeric, two-component, `nan`, and `inf` positions fail closed.

The committed real-GLRD Python regression remains the stronger repository gate:

```bash
python converters/scripts/test_xml_to_cii2019_glrd_coordinate_custody.py
```

It has **not** been represented here as executed because this environment could
not materialize the complete repository checkout from the GitHub connector.

---

## 6. X002 — OD / bore / property authority

### Implemented bore authority

`converters/xml-cii2019-core/staged-geometry-authority.js` now distinguishes
nominal-size semantics:

- naked staged `ABORE/LBORE/... = 4` is **not** interpreted as `4 mm`;
- explicit `DN100` / `DN=100` is treated as nominal DN;
- explicit millimetre units may supply millimetre nominal bore;
- explicit/embedded NPS/inch values use a governed NPS→DN table, including
  NPS 4 → DN100;
- an unqualified naked value is rejected as ambiguous and XML
  `OutsideDiameter→DN` remains authoritative.

### Implemented effective OD authority

`converters/xml-cii2019-core/outside-diameter-resolver.js` now separates:

```text
SourceOutsideDiameter
EffectiveOutsideDiameter
```

For passive FLAN / VALV / RIGID / INST endpoint discontinuities:

- raw endpoint OD is retained as source evidence;
- effective OD is corrected only when adjacent flow-path context gives one
  unique continuity answer;
- reducer boundaries stop inference;
- if previous/next flow-path diameters disagree, the component is review
  required rather than flattened.

The six governing GLRD refs are retained in the real-source test:

```text
134234934/19410
134234934/21710
134234934/21765
134234934/21820
134234934/21875
134234934/21930
```

Each source contains the 60.3 / 26.7 flange endpoint pattern. The test requires
the raw 26.7 value to be retained as source evidence but the effective flow-path
value to resolve to 60.3 when both adjacent sides establish 60.3.

### Local evidence actually executed

Local pure/VM tests passed for:

- naked `4` rejected as millimetres and OD 114.3 → DN100 fallback;
- explicit DN100;
- explicit/embedded NPS 4 → DN100;
- six representative 26.7→60.3 pass-through contexts;
- hostile 60.3→114.3 real transition remains unresolved/review-required.

The committed real GLRD test is:

```bash
node tests/xml-cii-x002-property-authority.test.js
```

---

## 7. X003 — rigid / valve / flange weight authority

### Implemented lifecycle separation

New `converters/xml-cii2019-core/weight-review-lifecycle.js` separates:

```text
RigidMatch1  -> overrides.rigidWeightMatch1
Rigidmatch2  -> overrides.rigidWeightFinal
runtime      -> overrides.rigidWeight (materialized effective authority only)
```

Precedence is:

```text
Rigidmatch2 final accepted value
    > RigidMatch1 selected value
```

Final review no longer rewrites Match1 history.

Plain unscoped node-number keys such as `480` are rejected. Scoped keys such as
`/B1::480` and `/B2::480` remain distinct.

### Implemented split-mass conservation

`split-rigid-weight-propagation.js` no longer copies one full component mass to
all zero siblings.

Rules:

1. one positive child mass → keep it once; zero siblings remain zero;
2. identical legacy positive duplicates → collapse duplicate copies to one
   deterministic owner;
3. different positive sibling masses → review required; no guessed allocation.

The compatibility kg→N scale remains explicitly `10`. X003 does not change the
scale to hide an incorrect selected mass.

### Local evidence actually executed

Local gates passed for:

- Match1 retained at 120.734 kg while Final review may accept 15 kg;
- `/B1::480` and `/B2::480` isolation;
- rejection of plain `480` persisted key;
- one 120.734 kg physical mass remains 120.734 kg;
- duplicate 120.734 + 120.734 collapses from 241.468 kg to one 120.734 kg
  owner;
- 15 kg vs 120.734 kg siblings block for review;
- `--weight-scale 10` remains active.

### Remaining X003 qualification limitations

- persisted decision identity is branch-scoped `branch::node`, which is safer
  than plain NodeNumber but is not yet the full
  `sourceId/branchOccurrence/componentOccurrence/physicalComponentGroupId`
  identity originally specified;
- the two UI review stages are separated in state, but strict proof that both
  always display the exact same frozen geometry representation remains open;
- the real GLRD final weight chain, especially `529→530`, still requires the
  complete Finalise-and-Run evidence produced by an actual run.

---

## 8. X004 — immutable evidence and digest chain

### Implemented

A schema-safe sidecar evidence document is generated; non-PSI116 evidence is
not injected into the exact converter input XML.

Required case-sensitive elements are present:

```xml
<preview>...</preview>
<RigidMatch1>...</RigidMatch1>
<Rigidmatch2>...</Rigidmatch2>
```

Distinct evidence digests include:

```text
source XML
staged JSON
support/master configuration
preview snapshot
RigidMatch1 snapshot
Rigidmatch2 snapshot
browser engine-request XML
Python converter-parse XML
CII output
```

The browser service retains the exact engine-request XML text and digest. The
Python coordinate-custody wrapper emits the path/digest of the exact
post-Python-enrichment XML file handed to `_parse_xml_document`, and the
standalone engine retains that exact parser-input XML text.

### Local evidence actually executed

- JS/Python FNV digest parity was checked (`abc` →
  `fnv1a32:1a47e90b:3` in both implementations);
- required evidence tag case was checked;
- Match1 and Match2 retain different values when Final review supersedes
  Match1;
- engine-request and converter-parse digest fields are independent.

### Remaining strict-freeze limitation

The snapshots are built from retained Preview / Match1 / Match2 lifecycle state
at the run boundary. This prevents regeneration from later enriched XML, but a
separate UI proof is still required to establish that each object is a deep,
immutable snapshot taken exactly at the Owner-specified click/finalization
instant.

---

## 9. X005 — Save Enriched XML ZIP

### Single-source implementation

The run phase exposes the exact action:

```text
Save Enriched XML ZIP
```

The package is deterministic and dependency-free:

- classic ZIP `STORE` mode;
- sorted file paths;
- CRC32;
- fixed DOS timestamp `1980-01-01 00:00:00`;
- identical frozen inputs produce identical ZIP bytes.

Per-source contents include:

```text
<source>/
  <source>.source.xml
  <source>.enriched.xml
  <source>.enriched-evidence.xml
  <source>.engine-input.xml
  <source>.converter-parse-input.xml
  <source>.cii
  <source>.diagnostics.json
  <source>.topology.json
  <source>.geometry-parity.json
  <source>.weight-conservation.json
  <source>.manifest.json
```

Download is blocked when required frozen artifacts are missing.

### Mode A implementation

Mode A creates one isolated directory per source plus:

```text
batch/batch-manifest.json
```

The batch manifest explicitly states:

```text
crossFileTopology = false
crossFileNodeRenumbering = false
crossFilePhysicalComponentGrouping = false
```

Duplicate input filenames receive different source directories using source
identity, so no file collision can combine two models.

### Local evidence actually executed

- deterministic ZIP bytes reproduced twice;
- Python `zipfile` independently opened the generated local archive;
- entry order, STORE mode, fixed timestamp, and exact contents were verified;
- Mode A duplicate-filename isolation passed locally;
- a failed/incomplete source makes the Mode A package `INCOMPLETE` instead of
  silently disappearing.

---

## 10. X006 — local exact-head qualification harness

Implemented local command:

```bash
node scripts/run-xml-cii-local-qualification.mjs \
  --report=artifacts/xml-cii-local-qualification.json
```

The harness executes, in order:

```text
X001 standalone route activation
X001 real GLRD coordinate converter regression
X002 real GLRD property authority regression
X003 weight lifecycle/conservation regression
X004 evidence/digest regression
X005 deterministic ZIP regression
X005 Mode A ZIP isolation regression
production-path activation assertions
```

It records:

```text
schema = xml-cii-local-qualification/v1
executionPolicy = LOCAL_ONLY_NO_WORKFLOW
repositoryHead = git rev-parse HEAD
governingBenchmark = GLRD-1000-PI-01.xml
per-test stdout/stderr/status
final PASS/FAIL
```

### Current qualification state

The harness script syntax was checked locally in this session. The entire
harness has **not** been represented as executed against the repository because
the available GitHub connector does not materialize a full checkout into this
container and direct repository archive download was unavailable.

Accordingly:

```text
X001_X005_IMPLEMENTATION_PRESENT
LOCAL_COMPONENT_GATES_EXECUTED_AS_RECORDED_ABOVE
X006_AGGREGATE_HARNESS_COMMITTED
X006_EXACT_CHECKOUT_AGGREGATE_NOT_YET_EXECUTED
DEPLOYED_BROWSER_PROOF_NOT_ESTABLISHED
PRODUCTION_AUTHORIZATION_NOT_ESTABLISHED
```

---

## 11. Governing GLRD final qualification matrix

X006/X007 qualification must still retain the following end-to-end checks.

### Coordinates

```text
10, 760, 1200, 1640, 2080, 2520, 2960
```

No false origin is permitted.

### OD

```text
596→598
1036→1038
1476→1478
1916→1918
2356→2358
2796→2798
```

A raw flange endpoint 26.7 mm is not an effective flow-path OD unless a real
size-change authority justifies it.

### Bore / property

At least one raw `=134234934/...` Branchname must be traced without rewriting
source identity. Naked NPS/inch designations may not appear as millimetres.

### Weight

At minimum retain full machine-readable traces for:

```text
48   → 50    2987.8701 N
168  → 170   2760.8601 N
478  → 480   1207.3401 N
529  → 530   1288.9501 N
888  → 890    978.67   N
3460 → 3469   950      N
```

Required chain:

```text
source physical component
→ candidates
→ RigidMatch1
→ Rigidmatch2
→ final physical mass
→ child allocation / conservation
→ kg→N factor
→ CII RIGID record
```

### Provenance

For any mismatch, identify the **first divergent representation**, not merely
raw XML vs final CII.

---

## 12. X007 — Mode A real browser qualification

Still required. Source-level and local package isolation are not equivalent to
deployed-browser proof.

Runtime evidence must include:

```text
repository/build identity
loaded module URL/digest
multi-file control visible and multiple=true
source inventory
per-source branch selection
zero-branch blocking
source-switch state restoration
per-source run identity
per-source evidence ZIP content
no mergedSourceText / cross-file graph
```

Hostile browser case:

- two files with duplicate Branchname values;
- two files with duplicate NodeNumber values;
- both remain valid separate-model inputs;
- no cross-file connection or physical-component grouping occurs.

---

## 13. X008 — release qualification

Before production authorization:

1. rebase/compare the final stack against the exact current `main`;
2. execute `scripts/run-xml-cii-local-qualification.mjs` on the exact candidate
   SHA;
3. run the governing GLRD through the actual browser/runtime path;
4. save and inspect the evidence ZIP;
5. independently spot-check Node 10, one repeated node, one 26.7-mm case,
   one reference-named branch, `478→480`, `529→530`, one restraint, and one
   two-source Mode A hostile case;
6. confirm unrelated converters did not regress;
7. record the exact qualified SHA;
8. obtain explicit Owner production authorization.

A PR merge, local unit test, workflow state, or agent statement is not itself
production authorization.

---

## 14. Governing engineering decisions

Unless the Owner changes them explicitly:

1. Occurrence identity outranks engineering NodeNumber internally.
2. Raw source properties remain evidence; effective CII properties require
   component/flow-path authority.
3. Raw reference-looking Branchname values are preserved.
4. Nominal-size units are explicit; naked numbers do not silently acquire mm
   or inch semantics.
5. `RigidMatch1` and `Rigidmatch2` are separate decisions.
6. Physical-component mass is conserved across generated/split children.
7. A large mass on a short rigid is not automatically wrong.
8. Malformed/unknown engineering values fail closed.
9. Engine-request XML and converter-parse XML are distinct retained facts.
10. Mode A is separate-model batch execution; no cross-file merge/offset/stitch.
11. Evidence is packaged from retained state; it is not reconstructed from
    final CII after the fact.
12. GitHub workflows are not qualification gates for this workstream.

---

## 15. Immediate next action

Use a normal local checkout of the current stacked candidate and execute:

```bash
git rev-parse HEAD
node scripts/run-xml-cii-local-qualification.mjs \
  --report=artifacts/xml-cii-local-qualification.json
```

If that aggregate passes, inspect the real GLRD artifacts and close any
remaining X003/X004 provenance gaps before X007 browser qualification.

Do **not** use GitHub Actions as a substitute for this local gate.
