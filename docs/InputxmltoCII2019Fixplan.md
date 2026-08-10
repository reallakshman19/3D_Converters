# InputXML / PSI116 XML → CII 2019 Concept, Current-State Ground Truth and Roadmap

**Canonical file:** `docs/InputxmltoCII2019ConceptNote.md`  
**Repository:** `reallaksh19/3D_Converters`  
**Audited source baseline:** `b168cced3f5aaaada15de290d14ce64928a9a7a3`  
**Audit date:** 2026-08-10  
**Document status:** `GOVERNING_CONCEPT_AND_ROADMAP`  
**Engineering status:** This document governs architecture, data authority, qualification gates, benchmark expectations, and roadmap sequencing for the XML/InputXML → CII 2019 programme. It is not, by itself, proof that the current browser route is production-qualified or that any reported benchmark defect has been numerically corrected.

---

## 0. Purpose and mandatory use

This document is the source-level concept, current-state record, and forward roadmap for the **XML / InputXML → CII 2019** programme in `3D_Converters`.

It shall be used as the first reference when:

- changing PSI116 XML or InputXML source handling;
- adding or changing branch selection or multi-XML processing;
- changing branch, node, component, coordinate, bore, OD, wall, corrosion, material, pressure, temperature, density, restraint, support, rigid, valve, flange, or weight authority;
- changing Preview, Weight Match, final rigid-review, enriched XML, CII, diagnostics, manifests, or downloadable artifacts;
- changing split-condensed valve/flange behavior or node renumbering;
- adding new enrichment or recovery fields;
- deciding whether a capability exists in source, is actually visible in the browser, is numerically validated, or is production-authorized;
- preparing root-cause investigations, implementation work packs, benchmark gates, and merge reviews;
- interpreting historical PR descriptions, tests, or readiness documents whose baseline may no longer match the running application.

A capability shall **not** be claimed merely because a file, test, import, PR, label, or source branch exists. The claim must match the executable route at the inspected exact head and must be supported by the required runtime and benchmark evidence.

### 0.1 Authority precedence

When records disagree, use this order:

1. **Executable source and actual browser/runtime behavior at the inspected exact head.**
2. **Exact-head retained benchmark artifacts and conversion evidence.**
3. **Canonical data contracts and runtime state transitions.**
4. **This document, provided it is updated in the same PR as a material capability change.**
5. **Historical tests, readiness reports, PR descriptions, screenshots, prompts, and superseded notes.**

A static import proves only that source is present. It does not prove that the user can reach the UI, that the correct build is deployed, that an event is bound, that a cache-busted module loaded, or that the resulting CII is correct.

### 0.2 Required update rule

Any PR that materially changes the XML/InputXML → CII 2019 programme shall update this document in the same PR. Material changes include:

- source file loading, multi-file loading, source detection, or source state;
- branch selection, branch scoping, or staged-JSON scoping;
- line-key, line-list, piping-class, material, or process-data authority;
- coordinates, node identity, branch identity, node renumbering, or topology;
- bore, OD, wall thickness, corrosion, insulation, or density rules;
- weight-master matching, suggestions, overrides, allocation, splitting, or propagation;
- restraint/support classification or materialization;
- Preview, Weight Match, rigid-review, parity, enriched XML, CII, diagnostics, or manifests;
- engine input, Pyodide/runtime ownership, worker boundaries, or compatibility routes;
- browser activation or UI composition;
- benchmark fixtures, pass/fail tolerances, or production-readiness state;
- known limitations or known issues.

A future source guard should enforce this requirement.

---

# 1. Executive engineering conclusion

The repository contains a substantial standalone XML→CII 2019 framework with:

1. PSI116 XML and InputXML source detection;
2. a ten-phase adapted workflow UI;
3. branch-scoping source code;
4. Mode A multi-XML separate-model source code;
5. Preview/process-data enrichment;
6. JSON Trace / staged-JSON support evidence;
7. weight-master matching and rigid review;
8. support/restraint mapping;
9. run-parity enrichment before engine release;
10. enriched XML and optional CII generation;
11. diagnostics, manifests, and tests.

However, the current programme shall **not** be described simply as “implemented and working.” At audited baseline `b168cced...`:

- source activation imports the Mode A shell;
- Mode A source files exist;
- the phase registry exists;
- the operator reports that the multi-select XML UI is **not visible**;
- a real benchmark conversion reports major coordinate, OD, and weight anomalies;
- Preview and weight-review evidence is not yet embedded in enriched XML in the requested governed form;
- a dedicated enriched-XML ZIP evidence button does not yet satisfy the requested workflow.

Therefore the current programme status is:

```text
SOURCE_CAPABILITY_PRESENT
RUNTIME_UI_PROOF_INCOMPLETE
BENCHMARK_NUMERICAL_PARITY_FAILED
PRODUCTION_AUTHORIZATION_NOT_ESTABLISHED
```

The near-term programme objective is:

> **Make the browser-visible standalone route deterministic and auditable from source selection through CII output, with one authoritative branch/node/property lineage, explicit weight conservation, no silent zero-coordinate or wrong-OD fallbacks, embedded Preview/Weight evidence, and exact benchmark proof on `GLRD-1000-PI-01.xml`.**

No future change may treat the CII output as authoritative until this end-to-end chain passes.

---

# 2. Terminology and programme boundaries

## 2.1 PSI116 XML versus InputXML

This programme supports two different source families.

### PSI116 XML

Typical root:

```xml
<PipeStressExport xmlns="http://aveva.com/pipeStress116.xsd">
```

The audited benchmark `Benchmarks/XML to CII 2019/GLRD-1000-PI-01.xml` is PSI116 XML. Its declared units include:

```text
DistanceUnits      = mm
BoreUnits          = mm
PressureUnits      = pascal
TemperatureUnits   = degC
WeightUnits        = kg
ForceUnits         = newton
WallThicknessUnits = mm
FluidDensityUnits  = kg/m3
```

The PSI116 path performs browser-side enrichment before the compatibility engine receives the exact XML.

### InputXML

InputXML uses a separate direct enrichment branch with its own restraint policy, point-property basis, output mode, sentinel filling, and pressure-case normalization behavior.

InputXML and PSI116 XML may share masters and some downstream conversion infrastructure, but they shall not silently share assumptions about branch structure, endpoint semantics, coordinates, or restraint ownership.

## 2.2 Standalone route versus legacy Model Converters route

The standalone workflow is a separate callable API and app-level tab route.

The historical readiness document explicitly states that the old Model Converters production route is separate and was not automatically switched by the standalone work.

Accordingly:

```text
standalone source exists
!=
legacy production route replaced
!=
browser deployment proven
!=
conversion numerically qualified
```

Any future consolidation must be explicit and benchmarked.

## 2.3 Mode A

**Mode A — Separate Models** means:

- multiple PSI116 XML files may be selected;
- every XML remains an independent model;
- branch names are not merged across files;
- node numbers are not renumbered merely because another file uses the same number;
- topology is not connected across files;
- each source receives independent branch selection, staged JSON, workflow state, conversion result, and evidence.

Mode A does **not** mean combined-model merging.

## 2.4 Capability states

This document uses the following programme states:

| State | Meaning |
|---|---|
| `SOURCE_PRESENT` | Source files and imports exist. No runtime claim is implied. |
| `UI_VISIBLE` | The intended control is proven visible in the actual browser route. |
| `RUNTIME_BOUND` | Events/state transitions are proven to invoke the intended implementation. |
| `BENCHMARK_PASS` | The exact benchmark passes governed acceptance checks. |
| `PARITY_PASS` | Preview/final facts equal the exact engine input and output quantities under the declared mapping. |
| `EVIDENCE_COMPLETE` | Required Preview, Weight Match, final rigid review, diagnostics, and manifests are retained and exportable. |
| `PRODUCTION_AUTHORIZED` | Ordinary production use has been explicitly approved after exact-head qualification. |
| `BLOCKED` | Execution or promotion must stop because a named gate is not satisfied. |
| `CONCEPT` | Planned capability only. |

`SOURCE_PRESENT`, `UI_VISIBLE`, `BENCHMARK_PASS`, and `PRODUCTION_AUTHORIZED` are separate decisions.

---

# 3. Current runtime architecture and ownership

## 3.1 Public workflow entry

The current standalone API is:

```text
runXmlCii2019Workflow(job, runtime)
```

The primary route is:

```text
UI / programmatic caller
  -> workflow job normalization
  -> source-kind resolution
  -> workflow service
  -> PSI116 XML or InputXML branch
  -> enrichment / run parity
  -> exact engine input
  -> CII compatibility engine
  -> normalized result
  -> output panel / downloads
```

Primary source boundaries include:

```text
tabs/xml-cii-2019-standalone/xml-cii-workflow-api.js
tabs/xml-cii-2019-standalone/xml-cii-workflow-service.js
tabs/xml-cii-2019-standalone/xml-cii-workflow-types.js
tabs/xml-cii-2019-standalone/xml-cii-workflow-ui-adapter.js
tabs/xml-cii-2019-standalone/xml-cii-workflow-engine-client.js
```

## 3.2 PSI116 XML parity route

The current PSI116 XML path uses:

```text
source XML
  -> parent enrichment authority
  -> DTXR annotation
  -> standalone Preview/process parity
  -> expected-entry reconstruction
  -> run-parity evidence
  -> exact enriched XML released to engine only when parity passes
```

Important source:

```text
tabs/xml-cii-2019-standalone/xml-cii-standalone-run-parity.js
```

This module currently states that the parent enrichment performs process data, staged support restraints, DTXR annotations, weight-master matches, and valve/flange split renumbering before Python conversion.

The parity concept is correct in principle, but its benchmark authority must be strengthened so that coordinates, OD, element topology, and weight conservation are checked, not only selected Preview/Weight fields.

## 3.3 UI composition root

At baseline `b168cced...`, the standalone tab imports:

```text
xml-cii-adapted-workflow-shell-mode-a.js?v=20260804-mode-a-v1
```

The Mode A shell composes:

```text
mode-a core shell
+ rigid-review actions enhancement
+ JSON Trace field enhancement
```

The Mode A core composes:

```text
workflow state
-> Mode A state ref
-> branch-scope state ref
-> active phase renderer
-> Mode A event binder
```

This is important current source truth, but the operator reports that the intended multi-XML UI is not visible. That discrepancy is a P0 runtime-activation defect until browser proof identifies the missing boundary.

## 3.4 Phase registry

The current adapted workflow phase registry is:

| Phase | Label | Intended authority |
|---|---|---|
| 1 | Source & Masters | Source, masters, file inventory, branch selection |
| 2 | Regex Tester | Line-key, class, size extraction |
| 3 | Resolver / JSON Trace | Staged JSON and DTXR evidence |
| 4 | Preview | Final process/property review before conversion |
| 5 | Diagnostics | Normalized warnings and errors |
| 6 | Weight Match | Candidate review, suggestions, overrides |
| 7 | Support Type Mapper | Support/restraint mapping |
| 8 | Config | Effective configuration |
| 9 | Propagation Audit | Node-wise retention through XML/CII |
| 10 | Output / Run | Finalize, engine run, artifacts |

No phase may independently redefine a quantity already governed by an earlier authority without an explicit provenance transition.

---

# 4. Current capability matrix

| Capability | Source state at baseline | Runtime/engineering state | Governing note |
|---|---|---|---|
| Single PSI116 XML load | Present | Used | Baseline capability |
| Single InputXML load | Present | Used with separate direct enrichment | Keep semantics separate |
| Multiple PSI116 XML selection | Source present | **Operator cannot see UI** | P0 proof/fix required |
| Per-source isolated Mode A state | Source present | Runtime proof incomplete | Must prove browser switching |
| Branch multiselect | Source present | Runtime proof incomplete | Must prove actual selection changes downstream data |
| Staged JSON branch scoping | Source present | Needs live proof | Exact sibling exclusion required |
| Preview process enrichment | Present | Numerically suspect for reported benchmark rows | Requires exact lineage audit |
| JSON Trace DTXR evidence | Present | Useful evidence | Must not become parallel property authority |
| Support GT/ST mapping | Present after prior fixes | Benchmark-specific proof required | Must remain position/member aware |
| Weight candidate ranking | Present | Reported bad final weights | P0/P1 conservation fix required |
| Rigid review popup | Present | Used | Final selections must be retained as evidence |
| Split condensed valve/flange | Present | Reported weight/topology risks | Must be conservation-qualified |
| Run parity evidence | Present | Incomplete engineering coverage | Extend to geometry/properties/weights |
| Enriched XML | Present | Missing requested embedded review snapshots | Add governed evidence block |
| CII output | Present | **GLRD benchmark reports model break** | Not authoritative until benchmark pass |
| Per-source manifest | Present for Mode A source design | Runtime proof incomplete | Expand engineering evidence |
| Batch manifest | Present for Mode A design | Runtime proof incomplete | No model merging |
| Enriched XML ZIP | Not implemented in requested form | `CONCEPT` | Required enhancement |

---

# 5. Canonical data authority

## 5.1 General rule

Every emitted CII quantity shall have one traceable authority chain:

```text
source fact
  -> normalized fact
  -> optional explicit override
  -> effective Preview / review fact
  -> exact enriched XML fact
  -> exact engine-input fact
  -> CII quantity
```

No conversion stage may silently substitute a generic default when an authoritative source exists.

When the source is missing or contradictory, the system shall either:

1. derive the value using a declared, testable rule and record `derived` provenance; or
2. block or warn according to an explicit policy.

It shall not fabricate a plausible value and lose provenance.

## 5.2 Identity hierarchy

The minimum PSI116 XML identity hierarchy is:

```text
sourceId
  -> pipe identity
    -> Branch occurrence
      -> Node occurrence
        -> Component identity
```

Recommended internal occurrence keys:

```text
sourceId
branchOccurrenceId = sourceId + source-order branch ordinal + Branchname
nodeOccurrenceId   = branchOccurrenceId + source-order node ordinal
componentRef        = ComponentRefNo retained as evidence, not branch identity
```

Raw `Branchname` and `NodeNumber` remain engineering labels. They shall not be the sole internal identity when ambiguity exists.

## 5.3 Branch identity

A valid PSI116 branch identity originates from the actual `<Branchname>` element.

Values such as:

```text
=134234934/21706
=134234934/21732
=134234934/21977
```

appear in the reported Preview under the Branch Name column. These resemble AVEVA reference identities rather than normal engineering branch names.

Until traced, this condition shall be classified as:

```text
BRANCH_IDENTITY_PROVENANCE_SUSPECT
```

A component reference or fallback reference shall not silently become the authoritative branch name.

## 5.4 Node identity

`NodeNumber` is an engineering identifier, not a guaranteed globally unique database key.

For Mode A:

- duplicate node numbers across different source XML files are allowed;
- duplicate node numbers in different branches of one source may be allowed with occurrence-scoped identity and explicit warning;
- duplicate node numbers inside one branch shall fail closed until topology semantics are proven.

## 5.5 Units

The benchmark declares mm, kg, N, Pa, °C, and kg/m³ as above.

Every transformation shall retain the unit source and conversion step.

Examples:

```text
source Weight [kg]
  -> selected component mass [kg]
  -> engine/CII weight [N] using governed g
```

and:

```text
source Position [mm]
  -> canonical position [mm]
  -> emitted coordinate [mm]
```

No field may be interpreted as inches merely because a numeric value is small unless a governed profile explicitly authorizes that conversion.

---

# 6. Coordinate and topology authority

## 6.1 Coordinate invariant

For every source node or generated split node, final coordinates shall satisfy exactly one of these conditions:

```text
A. SOURCE_COORDINATE
B. EXPLICITLY_DERIVED_SPLIT_COORDINATE
C. EXPLICITLY_DERIVED_TOPOLOGY_COORDINATE
```

The following is prohibited:

```text
missing/failed parse -> (0,0,0) silent default
```

A final `(0,0,0)` is acceptable only when:

- the source coordinate is genuinely `(0,0,0)`, or
- a documented coordinate-system transformation produces it and the transformation evidence is retained.

## 6.2 Topology continuity invariant

For every emitted element:

```text
from-node coordinate
+ to-node coordinate
+ component geometry
```

must be consistent with the source topology and any declared split operation.

The final route shall detect:

- impossible jumps;
- zero-length elements not explicitly intended;
- unexpected large offsets;
- orphan nodes;
- generated nodes without parent component provenance;
- coordinates that reset to zero;
- from/to references that point to an unrelated branch occurrence.

## 6.3 Reported benchmark symptom

For the current `GLRD-1000-PI-01.xml` conversion, the operator reported output coordinates including:

```text
10    0.000       0.000       0.000
760   0.000       0.000       0.000
990   107898.000  101039.000  -108661.500
1200  0.000       0.000       0.000
1240  107898.000  101279.000  -108218.500
1640  0.000       0.000       0.000
1680  106398.000  101279.000  -108218.500
2080  0.000       0.000       0.000
2120  104898.000  101279.000  -108218.500
2520  0.000       0.000       0.000
2560  103398.000  101279.000  -108218.500
2960  0.000       0.000       0.000
3000  101898.000  101279.000  -108218.500
```

The source benchmark itself contains a non-zero position for source Node 10.

Therefore at least Node 10 demonstrates that a zero coordinate in the converted output cannot be accepted as source truth.

This issue is `P0` because coordinate corruption breaks the physical model independent of stress-code calculations.

---

# 7. Bore, OD, wall, and size authority

## 7.1 Distinguish the quantities

The programme shall never conflate:

```text
nominal line size
BoreMm / nominal bore
OutsideDiameter
WallThickness
CorrosionAllowance
inside diameter derived from OD and wall
weight-master bore key
```

These are related but not interchangeable.

## 7.2 OD authority hierarchy

For an existing PSI116 source node, preferred OD authority is:

1. valid source `<OutsideDiameter>` for that node/component;
2. explicit component geometry from a governed source with exact component identity;
3. a qualified piping-class/size derivation where source OD is absent and the derivation rule is retained;
4. otherwise block/warn; do not substitute an arbitrary small-pipe OD.

A nominal bore or weight-master key must not overwrite a valid source OD.

## 7.3 Wall and corrosion authority

Preview currently resolves wall/corrosion values through master/override logic. Final enriched XML shall record:

```text
value
source authority
match method
confidence / exactness where applicable
override identity, if any
```

Approximate line or class matches shall never be visually indistinguishable from exact engineering identity.

## 7.4 Reported benchmark symptom

The operator reports `OD = 26.7 mm` around these element pairs:

```text
596  -> 598
1036 -> 1038
1476 -> 1478
1916 -> 1918
2356 -> 2358
2796 -> 2798
```

This repeated pattern is a governed benchmark defect until each affected occurrence is traced through:

```text
source Branchname
source NodeNumber
source ComponentRefNo
source OutsideDiameter
source Position
Preview Size/BoreMm
resolved PipingClass
weight-master bore
exact enriched XML OutsideDiameter
engine-input OutsideDiameter
CII OD
```

The fix shall not be accepted merely because the displayed Preview size looks correct.

---

# 8. Process-data and Preview authority

## 8.1 Preview is an engineering gate

Phase 4 Preview is not a cosmetic table. It represents the effective process/property state that is intended to be applied before conversion.

For every branch occurrence, Preview shall retain at least:

```text
sourceId
branchOccurrenceId
BranchName
LineKey
From
To
Size / BoreMm
PipingClass
Material
Rating
MaterialCode
P1 / DesignPressure
Hydro/TestPressure
T1
T2
T3
Density
WallThickness
Corrosion
match method for each resolved field
override/derived/source provenance
```

## 8.2 Preview row lineage

A Preview row shall be bound to a source branch occurrence, not only to a normalized text key.

This is required because the reported Preview contains both ordinary branch names and suspicious AVEVA-reference-looking rows.

## 8.3 Exact versus approximate mapping

The reported Preview contains examples such as:

```text
93834 ✓ exact 100%
31441 approx 91%
```

The programme shall define which fields may be populated from approximate matches and which require exact authority.

At minimum:

- an approximate match shall be retained explicitly in enriched evidence;
- an approximate match shall not silently redefine source branch identity;
- a different piping-class family shall not be used merely because its text similarity score is high;
- material/rating/wall/corrosion propagation shall be independently checkable.

## 8.4 Preview-to-engine parity

The parity gate shall compare every conversion-critical Preview quantity against the exact engine-input XML, including:

```text
coordinates
OD
wall
corrosion
piping class
material
material code
rating
pressure
temperature
density
weight
restraints
branch identity
node identity
```

A Preview-only match is insufficient.

---

# 9. Weight authority and conservation

## 9.1 Distinguish mass, weight, candidate, and element allocation

The programme shall explicitly distinguish:

```text
weight-master mass candidate [kg]
selected component mass [kg]
manual override mass [kg]
source node mass [kg]
final effective component mass [kg]
allocated child/split mass [kg]
emitted CII weight [N]
```

The UI shall never show one quantity while the engine consumes another without a retained transformation record.

## 9.2 Current run-parity behavior

The current standalone parity module builds mapped node weights for:

```text
FLAN
VALV
RIGID
INST
```

and chooses an explicit rigid-weight override when present, otherwise an automatic non-zero weight match.

It then writes the mapped value into XML only when the existing node weight is missing or zero.

That rule by itself does not prove that a candidate attached to the correct physical component, or that split child elements conserve the selected component mass.

## 9.3 Weight conservation invariant

For every reviewed physical component or split-component group:

```text
selected_component_mass_kg
=
sum(final_child_mass_kg)
```

within a governed tolerance.

And:

```text
sum(final_child_weight_N)
=
selected_component_mass_kg * g
```

within a governed tolerance using the configured gravitational constant.

The following are prohibited:

- copying a full valve mass to multiple split children;
- applying a valve candidate to an adjacent rigid or flange solely by proximity;
- accumulating flange + valve + rigid masses onto one short segment without explicit grouping authority;
- converting kg to N twice;
- using an extrapolated candidate as “suggested” without preserving the extrapolation status;
- hiding the selected candidate behind a later popup value.

## 9.4 Suggested versus override semantics

The UI shall distinguish at least:

```text
SOURCE
SUGGESTED_EXACT
SUGGESTED_INTERPOLATED
SUGGESTED_EXTRAPOLATED
MANUAL_OVERRIDE
MAPPED_OVERRIDE
FINAL_POPUP_OVERRIDE
```

“Use suggested weight” shall record which exact candidate was accepted.

A later generated rigid weight shall not be reported as though it were the originally selected candidate.

## 9.5 Reported benchmark symptom

The operator reports small elements with large final weights, including:

| From | To | Weight N | Length mm |
|---:|---:|---:|---:|
| 48 | 50 | 2987.8701 | 150.2 |
| 168 | 170 | 2760.8601 | 124.2 |
| 478 | 480 | 1207.3401 | 112.2 |
| 529 | 530 | 1288.9501 | 19.1 |
| 598 | 600 | 1207.3401 | 112.2 |
| 678 | 680 | 1207.3401 | 112.2 |
| 808 | 810 | 1207.3401 | 112.2 |
| 849 | 10000 | 150 | 19.1 |
| 888 | 890 | 978.67 | 112.2 |
| 959 | 960 | 1288.9501 | 19.1 |
| 1258 | 1260 | 1207.3401 | 112.2 |
| 1299 | 10010 | 150 | 19.1 |
| 1409 | 1410 | 617.11 | 19.1 |
| 1698 | 1700 | 1207.3401 | 112.2 |
| 1739 | 10020 | 150 | 19.1 |
| 1849 | 1850 | 617.11 | 19.1 |
| 2138 | 2140 | 1207.3401 | 112.2 |
| 2179 | 10030 | 150 | 19.1 |
| 2289 | 2290 | 617.11 | 19.1 |
| 2578 | 2580 | 1207.3401 | 112.2 |
| 2619 | 10040 | 150 | 19.1 |
| 2729 | 2730 | 617.11 | 19.1 |
| 3018 | 3020 | 1207.3401 | 112.2 |
| 3059 | 10050 | 150 | 19.1 |
| 3169 | 3170 | 617.11 | 19.1 |
| 3348 | 3350 | 1207.3401 | 112.2 |
| 3439 | 10060 | 150 | 19.1 |
| 3460 | 3469 | 950 | 169 |

These values are not automatically wrong merely because the segment is short; rigid component weight is a lumped property and may legitimately sit on a short rigid. The defect to prove or disprove is **mapping and conservation**, not “large weight on short length” by appearance alone.

For each listed row, RCA shall trace:

```text
source component
selected candidate
candidate method
selected mass
weight override key
split group
allocated mass
kg-to-N conversion
exact XML Weight
engine input
CII element
```

The fix shall be rejected if this trace is unavailable.

---

# 10. Support and restraint authority

The support/restraint route shall retain a strict separation between:

```text
captured staged evidence
classified support kind
production support-mapping rule
materialized XML restraint
CII restraint
```

JSON Trace evidence is not production authority by itself.

For position groups containing multiple support members, the conversion must retain all independently authoritative support kinds, subject to deduplication by actual restraint identity rather than by a broad REST classification.

Previous MDS work established the need to distinguish examples such as:

```text
PIPE-REST -> REST -> +Y
GT*       -> GUIDE -> GUI
ST*       -> LINESTOP -> LIM
```

Future changes shall retain that principle while extending parity evidence to final CII restraint output.

---

# 11. Mode A multi-XML concept and runtime gate

## 11.1 Intended UI

The Source control shall accept multiple PSI116 XML files and display a source inventory under `1 Source & Masters -> Source`.

Each source shall expose:

```text
Use / enabled
Source alias / filename
sourceId
selected branches / total branches
node count
staged JSON status
conflict summary
Open / Active
Remove
```

The active source shall then expose the hierarchical branch multiselect.

## 11.2 Branch multiselect

Required behaviors:

```text
all selected by default
tri-state parent groups
individual /B1, /B2, ... selection
live search
Select all
Clear all
Select visible
Invert selection
selected count
zero-selection block
```

## 11.3 Current discrepancy

At exact audited head, source files for Mode A and branch scoping are present and the standalone tab imports the Mode A shell.

The operator nevertheless reports:

```text
"I don't see any multiselect xml UI still"
```

This is a P0 capability-state discrepancy.

The next implementation shall first prove where the route diverges:

```text
repository main source
-> deployed artifact / Pages build
-> tab registry
-> imported module URL/version
-> shell renderer
-> Source loader sub-tab
-> DOM input[multiple]
-> Mode A inventory injection
-> event capture
```

No further Mode A feature work should be layered on top until this visibility chain is proven.

## 11.4 Mode A duplicate policy

Across separate files:

```text
same Branchname  -> warning, allowed
same NodeNumber  -> warning, allowed
```

Within one source:

```text
duplicate Branchname occurrence       -> block pending explicit semantics
duplicate NodeNumber within one branch -> block
```

Identical file content shall be deduplicated by source digest.

No node renumbering or cross-file topology merge belongs in Mode A.

---

# 12. Preview and rigid-weight evidence as first-class output

## 12.1 Requirement

Preview and rigid-weight decisions are conversion-critical engineering evidence. They shall become part of the enriched XML evidence package.

The requested canonical XML elements are:

```xml
<preview>...</preview>
<RigidMatch1>...</RigidMatch1>
<Rigidmatch2>...</Rigidmatch2>
```

Element names are case-sensitive. Do not silently rename them without an explicit schema migration.

## 12.2 `<preview>`

`<preview>` shall contain the finalized Phase 4 Preview data actually used for the run.

It shall not be a pasted HTML table. It shall be structured XML.

Recommended shape:

```xml
<preview schema="xml-cii-preview-evidence/v1" sourceDigest="..." selectionDigest="...">
  <BranchRow branchOccurrenceId="...">
    <BranchName>...</BranchName>
    <LineKey>...</LineKey>
    <From>...</From>
    <To>...</To>
    <BoreMm>...</BoreMm>
    <PipingClass value="..." authority="exact|approx|override|derived" confidence="..."/>
    <Material value="..." authority="..."/>
    <Rating value="..." authority="..."/>
    <MaterialCode value="..." authority="..."/>
    <DesignPressure>...</DesignPressure>
    <HydroPressure>...</HydroPressure>
    <T1>...</T1>
    <T2>...</T2>
    <T3>...</T3>
    <Density>...</Density>
    <WallThickness>...</WallThickness>
    <Corrosion>...</Corrosion>
  </BranchRow>
</preview>
```

The exact schema may evolve, but the evidence must remain machine-readable and deterministic.

## 12.3 `<RigidMatch1>`

`<RigidMatch1>` shall capture the Weight Match phase **after the user has accepted/finalized Weight Match and before the final run popup can alter values**.

Each row shall retain:

```text
status
branchOccurrenceId
nodeOccurrenceId
branchName
lineKey
componentType
bore
rating
node number/display
ComponentRefNo
DTXR
valve hint
length
current/finalized mass
candidate list
selected candidate
candidate method
candidate length delta
candidate score
source/override authority
```

## 12.4 `<Rigidmatch2>`

`<Rigidmatch2>` shall capture the last rigid-weight review popup that appears after `Finalise and Run`.

It shall retain:

```text
popup row identity
value shown before user action
candidate values shown
rating shown
DTXR shown
manual value entered
candidate selected, if any
final accepted mass
action = apply | use-all-suggestions | skip | cancel
```

Only `apply` or an explicitly authorized `skip` path may release final conversion according to the governing policy.

## 12.5 Evidence timing

The evidence snapshots shall be created at authoritative transitions:

```text
Preview finalized -> freeze <preview>
Weight Match finalized -> freeze <RigidMatch1>
Final rigid popup accepted/skipped -> freeze <Rigidmatch2>
```

They shall not be regenerated later from mutated state because that destroys evidence of what the operator actually reviewed.

## 12.6 Evidence parity

Before engine release, an independent parity checker shall verify that:

```text
<preview> effective values
<RigidMatch1> finalized weight values
<Rigidmatch2> final popup values
```

are consistent with the exact engine-input XML according to the declared precedence rules.

---

# 13. Enriched XML and ZIP evidence package

## 13.1 Enriched XML role

The enriched XML shall be both:

1. the exact or hash-linked source used to build CII; and
2. the retained conversion evidence package.

It shall not merely be an intermediate file that loses UI decisions.

## 13.2 Evidence container

The requested tags may be appended under a deterministic evidence container where allowed by the XML contract, for example:

```xml
<ConversionEvidence schema="xml-cii-conversion-evidence/v1">
  <preview>...</preview>
  <RigidMatch1>...</RigidMatch1>
  <Rigidmatch2>...</Rigidmatch2>
</ConversionEvidence>
```

If the PSI116 namespace/schema makes direct insertion unsafe for the compatibility engine, use a controlled strategy:

```text
engine-input enriched XML without non-schema evidence
+
hash-identical post-engine evidence XML with ConversionEvidence
```

The document must record which exact file was sent to the engine and its digest.

Do not break the engine schema merely to embed evidence.

## 13.3 ZIP button

Add a dedicated button:

```text
Save Enriched XML ZIP
```

For a single active source, recommended ZIP content is:

```text
<source-alias>/
  <source-alias>.enriched.xml
  <source-alias>.cii
  <source-alias>.diagnostics.json
  <source-alias>.manifest.json
  <source-alias>.evidence.json   optional machine mirror
```

For Mode A, a later batch-level ZIP may contain one directory per independent source plus a batch manifest.

The ZIP must not merge models.

## 13.4 Digest requirements

Manifest/evidence shall record at least:

```text
source digest
selected-branch digest
staged JSON digest
support-config digest
Preview evidence digest
RigidMatch1 digest
Rigidmatch2 digest
engine-input digest
enriched-evidence XML digest
CII digest
```

This creates a deterministic replay chain.

---

# 14. Current known issues and source-truth debt

## K-01 — Mode A source exists but multiselect UI is not visible

**Observed:** user cannot see the multi-select XML UI.

**Source truth:** current standalone tab imports the Mode A shell and Mode A files exist.

**Risk:** static source tests may pass while the served/runtime route uses a stale artifact, different tab, stale cache, or non-rendered loader state.

**Action:** add browser-visible activation proof with a DOM assertion on the actual app route and deployed artifact.

**Severity:** `P0` for the requested capability.

## K-02 — converted coordinates reset to zero

**Observed:** multiple converted nodes are `(0,0,0)` even though the source benchmark contains non-zero positions.

**Risk:** broken geometry/topology and meaningless stress model.

**Action:** trace source position -> enriched XML -> split/renumber -> engine parse -> CII coordinate for every affected node.

**Severity:** `P0`.

## K-03 — repeated OD 26.7 mm on suspect element groups

**Observed:** OD 26.7 mm around several repeated pairs.

**Risk:** wrong stiffness, weight, SIF context, section properties, and code stress.

**Action:** trace source OD and size/bore authority occurrence-by-occurrence; forbid broad fallback overwrite.

**Severity:** `P0`.

## K-04 — suspicious branch identities in Preview

**Observed:** rows whose Branch Name looks like `=134234934/...` rather than a normal `/GLRD-.../B#` branch.

**Risk:** component/reference identity may be entering branch-level process and weight mapping.

**Action:** establish branch occurrence identity from `<Branchname>` and make fallback references evidence-only unless explicitly authorized.

**Severity:** `P0/P1` depending on downstream propagation.

## K-05 — large final weights after using suggestions

**Observed:** final CII includes several large weights on short elements and values that do not obviously match the displayed selected candidate.

**Risk:** wrong mass distribution, double allocation, candidate-to-neighbor leakage, kg/N confusion, or split-component duplication.

**Action:** implement component-group weight conservation and exact selected-candidate lineage.

**Severity:** `P0` where global mass or component weight is wrong.

## K-06 — Preview / Weight Match / final rigid popup are not retained in enriched XML

**Risk:** a final CII cannot be independently reconstructed from retained operator decisions.

**Action:** implement `<preview>`, `<RigidMatch1>`, and `<Rigidmatch2>` evidence snapshots.

**Severity:** `P1` evidence gap.

## K-07 — no dedicated enriched-XML ZIP evidence download

**Action:** add `Save Enriched XML ZIP` with manifest and artifacts.

**Severity:** `P1` usability/audit gap.

## K-08 — parity evidence does not yet cover every geometry/property invariant

Current parity focuses on selected process/weight facts and engine-input release.

**Action:** expand parity to coordinates, OD, topology, component grouping, and weight conservation.

**Severity:** `P0/P1` qualification gap.

## K-09 — old production-readiness narrative is stale relative to current capability growth

The existing readiness document predates Mode A and recent MDS/branch-scope work and records `needs-more-proof` at an older baseline.

**Action:** subordinate historical readiness reports to this concept note and create new exact-head qualification receipts rather than editing old history into apparent proof.

**Severity:** governance debt.

## K-10 — source/runtime/deployment state is not one authority

A merged commit may not prove which code is actually served to the user.

**Action:** exact-head browser proof shall record repository SHA, built asset/module URL, deployment SHA where available, and visible DOM contract.

**Severity:** `P0` for UI regressions.

---

# 15. Benchmark and qualification programme

## 15.1 Governing benchmark

The immediate regression benchmark is:

```text
Benchmarks/XML to CII 2019/GLRD-1000-PI-01.xml
```

Baseline source commit:

```text
b168cced3f5aaaada15de290d14ce64928a9a7a3
```

This benchmark shall be frozen by content digest for qualification.

## 15.2 Qualification layers

The programme shall use separate qualification layers.

### QL-1 — Source parse

Prove:

- branch count;
- node count;
- branch names;
- node numbers;
- coordinates;
- component refs;
- OD/wall/corrosion;
- units.

### QL-2 — Preview/process resolution

Prove every effective Preview field and its provenance.

### QL-3 — Weight Match

Prove candidate ranking, selected value, override key, component grouping, and conservation.

### QL-4 — Support/restraint

Prove staged evidence -> classification -> XML restraint -> CII restraint.

### QL-5 — Enriched XML

Prove exact effective values, no silent zero/default substitutions, and retained review evidence.

### QL-6 — Engine input

Prove exact digest and schema-compatible payload actually sent to Python/Pyodide.

### QL-7 — CII

Prove geometry, OD, wall, weight, restraints, and topology against the governed enriched input.

### QL-8 — Browser UI

Prove the actual user path, including multi-file input and branch multiselect.

## 15.3 Negative controls

Required negative controls include:

```text
missing Position must not silently become 0,0,0
malformed Position must block or warn deterministically
source OD present must not be overwritten by weight-master bore
ambiguous branch identity must not become a component reference silently
same node number in separate Mode A files must remain isolated
zero branch selection must block
candidate mass applied twice to split children must fail conservation
kg-to-N conversion applied twice must fail conservation
UI source import present but selector missing must fail browser activation test
```

---

# 16. Exact acceptance criteria for current reported defects

## 16.1 Mode A UI acceptance

At the actual application route:

1. Source file input has `multiple=true`.
2. Selecting two valid PSI116 XML files shows two source inventory rows.
3. Each file can be independently enabled/disabled.
4. Opening each file changes the active source badge.
5. Branch multiselect is visible below Source.
6. Branch counts match the parsed active source.
7. Clearing all branches blocks Preview/Run.
8. Selecting a branch filters Preview and final conversion to that source/branch only.
9. Reopening the first source restores its independent selection.
10. Duplicate node/branch labels across two source files do not cross-contaminate state.

## 16.2 Coordinate acceptance

For the benchmark:

- source Node 10 shall not become `(0,0,0)` because its source `<Position>` is non-zero;
- every reported zero-output node shall be traced to its source or generated-parent occurrence;
- no silent zero coordinate shall remain;
- every generated split node shall have explicit parent/component provenance;
- all CII from/to coordinates shall reconstruct a connected model consistent with source topology.

## 16.3 OD acceptance

For each reported pair:

```text
596-598
1036-1038
1476-1478
1916-1918
2356-2358
2796-2798
```

retain a machine-readable trace showing:

```text
source OD
source bore/size
Preview bore/size
resolved class
master-derived geometry, if any
enriched OD
engine-input OD
CII OD
```

The final OD must match the governing source/qualified derivation exactly.

## 16.4 Weight acceptance

For every listed suspect element/group:

- identify the physical component group;
- record selected mass and method;
- record all split child masses;
- prove mass conservation;
- prove one kg->N conversion;
- prove the exact CII weight;
- prove no candidate leaked to an adjacent component.

At the model level:

```text
sum(source-preserved mass + accepted mapped mass)
=
sum(final effective component-group mass)
```

within a declared tolerance after accounting for intentionally excluded/non-weight-bearing entities.

## 16.5 Evidence acceptance

The final enriched evidence XML shall contain:

```text
<preview>
<RigidMatch1>
<Rigidmatch2>
```

with deterministic source/node identities and digests.

The ZIP button shall download the exact final enriched evidence XML plus manifest and available CII/diagnostics artifacts.

---

# 17. Near-term remediation plan

## Q0 — concept and truth freeze

This document is Q0.

Actions:

- freeze exact benchmark SHA/digest;
- freeze current known-defect list;
- define canonical authority and acceptance criteria;
- no production-code fix claim before benchmark evidence.

## Q1 — browser activation and Mode A visibility

Goal: make source-present Mode A actually visible and provable.

Work:

- trace tab registration and route;
- trace deployed/current module asset;
- inspect Source loader DOM;
- ensure multi-file input is rendered, not only mutated after a panel exists;
- ensure branch selector is inserted in the visible Source workspace;
- add real browser-level activation regression;
- record exact-head proof.

Exit:

```text
MODE_A_UI_VISIBLE = true
MODE_A_EVENTS_BOUND = true
MULTI_SOURCE_ISOLATION_BROWSER_TEST = PASS
```

## Q2 — coordinate and topology custody

Goal: remove all silent coordinate loss.

Work:

- add occurrence-scoped coordinate ledger;
- trace source/generation provenance;
- assert no silent zero fallback;
- qualify split-node coordinates;
- add continuity/orphan checks;
- add GLRD exact regression.

Exit:

```text
ZERO_COORDINATE_WITHOUT_AUTHORITY = 0
TOPOLOGY_CONTINUITY = PASS
```

## Q3 — geometry property authority

Goal: correct OD/bore/wall/corrosion propagation.

Work:

- separate nominal size, bore, OD, wall, corrosion contracts;
- define source/master/override precedence;
- prevent weight-master fields from becoming geometry authority;
- add exact affected-pair traces;
- flag approximate class/line resolution.

Exit:

```text
GLRD_OD_AFFECTED_PAIRS = PASS
GEOMETRY_PROVENANCE_COMPLETE = true
```

## Q4 — weight conservation and split-component ownership

Goal: make every final weight reconstructable.

Work:

- introduce component-group identity;
- freeze Weight Match selection before run;
- freeze final popup selection separately;
- define split allocation policy;
- assert group and model mass conservation;
- assert kg-to-N exactly once;
- remove proximity-based leakage.

Exit:

```text
WEIGHT_GROUP_CONSERVATION = PASS
MODEL_WEIGHT_CONSERVATION = PASS
SUSPECT_GLDR_ROWS_TRACED = 100%
```

## Q5 — evidence XML

Goal: retain exactly what was reviewed.

Work:

- implement `<preview>`;
- implement `<RigidMatch1>`;
- implement `<Rigidmatch2>`;
- freeze snapshots at authoritative transitions;
- add digests and source occurrence IDs;
- verify evidence-to-engine parity.

Exit:

```text
PREVIEW_EVIDENCE = PASS
RIGID_MATCH_1_EVIDENCE = PASS
RIGID_MATCH_2_EVIDENCE = PASS
ENGINE_INPUT_EVIDENCE_PARITY = PASS
```

## Q6 — enriched XML ZIP

Goal: one audit package download.

Work:

- add `Save Enriched XML ZIP`;
- include enriched XML, CII, diagnostics, manifest;
- deterministic filenames;
- per-source packaging for Mode A;
- optional batch ZIP later without model merge.

Exit:

```text
ZIP_ARTIFACT_REPLAY = PASS
```

## Q7 — exact-head final benchmark

Run the complete GLRD benchmark in the actual browser and retained engine runtime.

No merge to production-authorized state until all P0 gates pass.

---

# 18. Future roadmap

## Horizon A — trustworthy single-source conversion

**Goal:** one PSI116 XML produces a geometrically and materially faithful CII with complete evidence.

Required:

- coordinate custody;
- geometry property custody;
- process-data custody;
- support/restraint parity;
- weight conservation;
- evidence XML;
- exact benchmark suite.

## Horizon B — trustworthy Mode A separate-model batch

**Goal:** multiple source XML files processed independently without identity leakage.

Required:

- browser-visible multi-select;
- source inventory;
- per-source branch scope;
- independent staged JSON;
- independent overrides/results;
- per-source evidence bundles;
- batch manifest;
- no cross-file node/branch merge.

## Horizon C — replayable evidence packages

**Goal:** every CII can be replayed from a retained evidence package.

Required:

- content digests;
- immutable review snapshots;
- exact engine input;
- exact config/master references;
- manifest schema;
- deterministic ZIP packaging.

## Horizon D — route convergence

**Goal:** decide whether standalone and legacy Model Converters routes remain separate or converge.

Required before convergence:

- benchmark parity;
- identical authority contracts;
- rollback plan;
- browser/runtime switch proof;
- no hidden popup-only behavior;
- explicit owner approval.

## Horizon E — production authorization

**Goal:** authorize ordinary engineering use only after exact-head qualification.

Production authorization requires:

```text
UI_VISIBLE
RUNTIME_BOUND
GEOMETRY_PARITY
PROPERTY_PARITY
WEIGHT_CONSERVATION
RESTRAINT_PARITY
EVIDENCE_COMPLETE
BENCHMARK_PASS
ROLLBACK_DEFINED
```

---

# 19. Roadmap gates and acceptance policy

## 19.1 Source gate

A source parser/loader must prove:

- exact source kind;
- units;
- branch/node counts;
- occurrence identities;
- no silent data loss;
- deterministic replay.

## 19.2 Geometry gate

Must prove:

- coordinates;
- topology;
- OD;
- bore;
- wall;
- corrosion;
- split geometry.

## 19.3 Process gate

Must prove:

- line key;
- line-list source;
- piping class;
- material;
- rating;
- pressure;
- temperature;
- density;
- exact/approx/override provenance.

## 19.4 Weight gate

Must prove:

- candidate source;
- selected candidate;
- final popup decision;
- group ownership;
- split allocation;
- kg/N conversion;
- group and model conservation.

## 19.5 Restraint gate

Must prove:

- staged evidence;
- production classification;
- materialized XML restraint;
- CII restraint;
- no broad-rule collapse.

## 19.6 Evidence gate

Must prove:

- `<preview>`;
- `<RigidMatch1>`;
- `<Rigidmatch2>`;
- exact engine input digest;
- manifest;
- artifact replay.

## 19.7 UI gate

Must prove the real browser path, not just source imports or unit tests.

## 19.8 Production gate

Requires all previous gates plus exact-head browser/engine benchmark evidence and rollback criteria.

---

# 20. Mandatory PR maintenance checklist

Every future XML/InputXML → CII 2019 capability PR shall answer:

```text
1. What exact capability changed?
2. Which source file is runtime authority?
3. Which source kinds are affected: PSI116 XML, InputXML, or both?
4. Which UI phase is affected?
5. Which branch/node identity contract changed?
6. Which coordinate/topology contract changed?
7. Which bore/OD/wall/corrosion authority changed?
8. Which process-data authority changed?
9. Which weight authority or allocation changed?
10. Which restraint/support authority changed?
11. Which enriched XML fields/evidence changed?
12. Which exact engine input changed?
13. Which CII quantities changed?
14. Which independent benchmark validates it?
15. Which exact-head browser proof ran?
16. Which exact-head engine proof ran?
17. Which authority state advanced?
18. Which authority states remain false?
19. Which limitations were added or removed?
20. Was this concept note updated?
```

A PR shall be blocked when source, UI, evidence, engine input, and CII cannot be reconciled.

---

# 21. Canonical source inventory

## 21.1 Standalone application entry and workflow

```text
tabs/xml-cii-2019-standalone-tab.js
tabs/xml-cii-2019-standalone/xml-cii-workflow-api.js
tabs/xml-cii-2019-standalone/xml-cii-workflow-api-atta-default.js
tabs/xml-cii-2019-standalone/xml-cii-workflow-service.js
tabs/xml-cii-2019-standalone/xml-cii-workflow-types.js
tabs/xml-cii-2019-standalone/xml-cii-workflow-ui-adapter.js
tabs/xml-cii-2019-standalone/xml-cii-workflow-engine-client.js
```

## 21.2 UI and phase composition

```text
tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-registry.js
tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell-mode-a.js
tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell-mode-a-core.js
tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels-mode-a.js
tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a.js
tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js
```

## 21.3 Branch scope and Mode A

```text
tabs/xml-cii-2019-standalone/xml-cii-branch-scope.js
tabs/xml-cii-2019-standalone/xml-cii-mode-a-batch.js
tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-branch-scope.js
tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-branch-scope-state.js
tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-branch-scope-panel-v2.js
tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-mode-a-state.js
tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-mode-a-panel.js
tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow-mode-a.js
```

## 21.4 Preview, parity, JSON Trace, support, and weight

```text
tabs/xml-cii-2019-standalone/xml-cii-standalone-run-parity.js
tabs/xml-cii-2019-standalone/xml-cii-run-parity-evidence.js
tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js
tabs/xml-cii-2019-standalone/xml-cii-json-trace-fields.js
tabs/xml-cii-2019-standalone/xml-cii-support-type-mapper.js
tabs/xml-cii-2019-standalone/xml-cii-standalone-dtxr-enrichment.js
tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-dryrun.js
tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match.js
converters/xml-cii2019-core/weight-match-model.js
converters/xml-cii2019-core/weight-valve-hints.js
converters/xml-cii2019-core/support-mapping.js
converters/xml-cii2019-core/support-mapping-config.js
```

## 21.5 Parent enrichment compatibility route

```text
tabs/model-converters/converters/xmltocii2019_helper/enrichment-run-parity.js
tabs/model-converters/converters/xmltocii2019_helper/enrichment-core.js
tabs/model-converters/converters/xmltocii2019_helper/weight-match-renderer.js
```

## 21.6 Governing benchmark

```text
Benchmarks/XML to CII 2019/GLRD-1000-PI-01.xml
```

## 21.7 Existing supporting documentation

```text
docs/xml-cii-2019-standalone-parity.md
docs/xml-cii-2019-standalone-production-readiness.md
docs/xml-cii-2019-standalone-live-proof.md
```

These historical documents remain useful evidence of programme evolution but are subordinate to executable exact-head source and this governing concept note when capability state has changed.

---

# 22. Final governing statement

The XML/InputXML → CII 2019 programme already contains substantial enrichment, Preview, JSON Trace, support mapping, weight review, branch scope, Mode A, parity, and engine-integration source. The next problem is not to add more isolated features. The priority is to establish one trustworthy, browser-visible and numerically conserved authority chain.

The governing sequence is:

```text
source/runtime truth reconciliation
  -> prove Mode A UI activation
  -> fix coordinate/topology custody
  -> fix OD/bore/wall/property custody
  -> fix component-group weight conservation
  -> retain Preview / RigidMatch1 / Rigidmatch2 evidence
  -> package enriched evidence as ZIP
  -> pass GLRD exact benchmark
  -> only then consider production authorization or route convergence
```

No future PR may shorten this chain by relabelling source presence, a passing isolated unit test, a Preview table, or a plausible CII file as end-to-end engineering qualification.
