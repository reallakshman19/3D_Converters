# Bolted-joint / flange source archive

Status: `BYTE_CUSTODY_ESTABLISHED / NOT CODE OR DESIGN AUTHORITY`

Chain: `ENGCALC-BOLTED-JOINTS` — tracking issue #721.

## Committed location

The owner-supplied originals are committed in this repository at:

```text
docs/flange/
```

`SHA256SUMS.txt` in this directory pins their exact bytes. It is a real
`sha256sum -c` manifest and is enforced on every run by
`tests/flange-source-archive-custody.test.mjs`, so a silent edit, re-save, or
re-export of any source fails the suite.

Verify by hand with:

```bash
cd docs/flange && sha256sum -c ../engineering-calculations/source-archive/bolted-joints-flanges/SHA256SUMS.txt
```

This closes the `ORIGINAL_BINARY_COPY = PENDING_TRANSPORT` condition recorded in
PR #722: the originals are present and hash-verified, and every hash matches the
manifest that PR published.

## Filename notes

Eleven files are committed; ten are distinct.

- `Flange Rating Vs Nozzle loads -Rev.3.xlsx` and
  `Flange Rating Vs Nozzle loads -Rev.3(1).xlsx` are **byte-identical**
  (`d664bad7…`). One is a browser download duplicate, not a second revision.
- The `(1)` suffix on four other filenames is likewise a download artefact. The
  bytes are the originals; only the names differ from the canonical list in
  PR #722.

Do not "clean up" these names in place. Renaming changes the manifest, and the
manifest is the custody record.

## What each source actually is

Classifications below come from reading the committed files, not from their
filenames. None of them is a governing Code source.

| File | What it contains | Programme use | Not usable for |
|---|---|---|---|
| `Flange Rating Vs Nozzle loads -Rev.3.xlsx` | UG-44(b) row check per size/class. Visible sheet `#150`, hidden `#300`/`#600`/`#900`, hidden `Sheet1` master table, hidden `Sheet2` pipe-stress record schema | Primary basis for the UG-44 row semantics and the 3D integration record shape | Master-data authority; the row loads are project scenario data |
| `Flange UG 44(1).xlsx` | 84 rows (21 sizes × classes 150/300/600/900) of `G`, gasket ID/OD, `PR`, `PD`, `FM` | Regression fixture (`tests/fixtures/flange-ug44-workbook-rows.json`) | An independent second source — it is byte-equivalent in content to the hidden `Sheet1` above |
| `Nozzle Flange MAWP Results-C101 (1).pdf` | PV Elite 28 nozzle-flange MAWP report, tabulating `G`, `FM`, `ME`, `FE`, `PD`, `Pmax` per nozzle | Cross-solver benchmark (already exercised in `tests/flange-ug44-core.test.mjs`) | Exact table reconstruction — displayed inputs are rounded |
| `bolt Paper-65.pdf` | *The effect of bolt tightening methods and sequence on the performance of gasketed bolted flange joint assembly* — tightening method/sequence vs. achieved preload scatter, bolt bending, gasket contact stress | Assembly-model evidence for P7 (preload scatter, tightening sequence); supports treating preload as primary and torque as one assembly method | Code or design authority; results are specific to the flange configuration studied |
| `Bolt Torque Calc(1).xls` | Detailed V-thread torque calculation for a 1"–8UN stud: thread geometry, lead angle, nut bearing geometry, decomposed nut factor | Basis for `bolts/detailed-friction.js` legacy comparator | Design authority; see the unit defect below |
| `Bolt Torques(1).xls` | BS 3580 Appendix B eq. 2 short-form torques, nut-factor table by lubricant, yield table by bolt grade, torque table M6–M27+ | Basis for `bolts/short-form.js` | Direct transcription of its `Design` column — see the rounding note below |
| `3427571_A Standard pipe supports Bolted.xls` | Clamped pipe-shoe friction-grip capacity and clamp bolt torque (Kellogg 3810, Shigley ch. 8) | Pipe-support clamp sizing reference; third torque instance at `K = 0.2` | **The LEG-04 3D bolt group.** It contains no bolt-group load distribution — see #721 |
| `flange design to BS5500.xls` | Full integral-flange design: shape constants `T`,`U`,`Y`,`Z`,`F`,`V`,`f`,`e`,`d`,`ho`; loads `Hd`,`Hg`,`Ht`; `Wm1`,`Wm2`,`Am`,`Ab`,`W`; stresses `Sh`,`Sr`,`St` | Basis for detailed flange strength (P4) | Governing use before independent qualification |
| `Integral-type Flange Rigidity Calc - ASME VIII Div 2 App M - UNCHECKED.xls` | Rigidity index `J = 52.14·V·Mo / (L·E·go²·ho·K1)`, integral flange, with `ACCEPTABLE` verdict | Basis for flange rigidity (P5) | Governing use — the file is marked `UNCHECKED` by its own author |
| `FLANGE LEAKAGE CHECK GRE(1).xls` | GRE/GRP equivalent-pressure flange check with part factors `f2`, plus gasket geometry tables for B16.5 FF 150#, B16.47 Series A and B, AWWA C207 B/D/E, ASA 150 | Basis for sealing/leakage (P6) | Any leak-rate claim — the method has no leak model |

## Defects found in the sources

These are properties of the supplied files. They are recorded here so that no
later transcription silently inherits them.

1. **`Flange Rating Vs Nozzle loads -Rev.3.xlsx` uses `3.14` in place of `pi`.**
   Every acceptance row computes
   `RHS = 3.14·G³·((PR−PD) + FM·PR)`. The literal makes the workbook allowable
   `0.0507%` smaller than the exact relation, so the workbook is marginally
   conservative — but its own 2" class 150 row passes by only `0.0083%`, which
   is smaller than the deviation the constant introduces. Reproduced and pinned
   in `tests/flange-ug44-workbook-basis.test.mjs`.

2. **`Bolt Torque Calc(1).xls` disagrees with itself on torque units.** The
   sheet reports `357.494 ft·lb` and `485.911 N·m` for the same result. The
   correct conversion of its own `ft·lb` value is `484.697 N·m`; the `N·m` cell
   is high by `0.25%`. The `ft·lb` value is the self-consistent one and is what
   `bolts/detailed-friction.js` reproduces.

3. **`Bolt Torques(1).xls` `Design` column is hand-rounded, not computed, and
   rounds the unsafe way.** The `Min` (0.5 yield) and `Max` (0.8 yield) columns
   reproduce `T = K·As·σy·f·d` exactly at the stated `K = 0.15`. The `Design`
   (0.7 yield) column does not: **33 of its 42** reproducible-grade cells differ
   from the formula, worst **+6.29%** (M12 grade 8.8: formula `65.86 N·m`,
   table `70.00 N·m`). The deviations are predominantly *positive*, so the
   tabulated Design torque exceeds the 0.7-yield target it claims to represent.
   Transcribe the formula, never that column.

4. **`Bolt Torques(1).xls` Titanium column does not follow from its own stated
   yield.** The sheet prints `Titanium = 275 N/mm²` and `Nut Factor used = 0.15`,
   but its Titanium torques need an effective `σy·K` product 33% higher — they
   reproduce exactly at either `366.67 MPa` with `K = 0.15`, or `275 MPa` with
   `K = 0.2`. The two readings cannot be separated from cell values alone
   (the formulas are not recoverable), so the grade is **excluded from
   exact-match assertions** and flagged unresolved. The other three grades
   (`4.6/304/316` at 230, `8.8` at 620, `B7` at 730 MPa) reproduce exactly.

5. **`Flange UG 44(1).xlsx` is not an independent source.** Its content matches
   the hidden `Sheet1` of the Rev.3 workbook. Treating the two as mutually
   corroborating would double-count one source.

## Authority boundary

Byte custody is not calculation authority. Presence of a workbook in this
repository does not establish Code compliance, design authority, master-data
authority, or governing eligibility for any calculation that cites it. The
governing gates remain those listed in
`docs/engineering-calculations/flange-ug44-source-register.md` and the
per-method registers beside it.

Rows read out of these workbooks are project scenario data. They enter the
repository only as `TEST_ONLY` regression fixtures, never as master records.
