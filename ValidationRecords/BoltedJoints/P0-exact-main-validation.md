# P0 — exact-checkout validation record (bolted joints / flange UG-44)

Programme: `ENGCALC-BOLTED-JOINTS` (tracking issue #721, step **P0**).

This record captures the P0 requirement: *run UG-44 and the bolt/registry suites on an
exact current-`main` checkout, followed by Engineering Calculation Console acceptance.*

It records observed results only. It does **not** grant Code compliance, design
authority, master-data authority, or governing eligibility to any calculation.

## Checkout under test

| Item | Value |
| --- | --- |
| Commit | `541d92b480756c031a30c4e9101b4ec29df1e08d` |
| Commit subject | `test(vibration): close Stage-4 qualification freeze gap (#719)` |
| Branch | `main` |
| Working tree | clean (no local modifications) |
| Runner | `node --test`, Node `v22.22.2`, Linux |

## Result 1 — UG-44 / flange suites: PASS

| Suite | Tests | Pass | Fail |
| --- | --- | --- | --- |
| `tests/flange-ug44-core.test.mjs` | 6 | 6 | 0 |
| `tests/flange-ug44-registry.test.mjs` | 3 | 3 | 0 |
| `tests/flange-master-store.test.mjs` | 8 | 8 | 0 |
| **Subtotal** | **17** | **17** | **0** |

## Result 2 — bolt / registry suites: PASS

| Suite | Tests | Pass | Fail |
| --- | --- | --- | --- |
| `tests/bolt-detailed-friction.test.mjs` | 8 | 8 | 0 |
| `tests/bolt-detailed-friction-applicability.test.mjs` | 1 | 1 | 0 |
| `tests/bolt-engineering-calculations-registry.test.mjs` | 6 | 6 | 0 |
| `tests/bolt-group-loads.test.mjs` | 8 | 8 | 0 |
| `tests/bolt-installation-strength.test.mjs` | 8 | 8 | 0 |
| `tests/bolt-installation-strength-detailed-torque.test.mjs` | 2 | 2 | 0 |
| `tests/bolt-master-store.test.mjs` | 7 | 7 | 0 |
| `tests/bolt-short-form.test.mjs` | 7 | 7 | 0 |
| **Subtotal** | **47** | **47** | **0** |

Combined bolted-joint / flange total: **64 tests, 64 pass, 0 fail.**

## Result 3 — Engineering Calculation Console acceptance: BLOCKED (2 pre-existing failures)

| Suite | Tests | Pass | Fail |
| --- | --- | --- | --- |
| `tests/engineering-calculation-console-model.test.mjs` | 7 | 7 | 0 |
| `tests/engineering-calculation-console-static.test.mjs` | 8 | 7 | **1** |
| `tests/engineering-calculation-console-fit-preflight.test.mjs` | 5 | 4 | **1** |
| **Subtotal** | **20** | **18** | **2** |

Both failures are in the **VIB (vibration) family landing**, not in any bolted-joint or
flange path. They reproduce on an unmodified `main` checkout, so they are pre-existing
and are not caused by the bolted-joint programme.

### Failure A — `engineering-calculation-console-static.test.mjs`

Test: *existing VIB family is the vibration landing entry and contains no engineering
kernel or canvas* (`tests/engineering-calculation-console-static.test.mjs:64`).

```
The input did not match the regular expression /TABLE DATA ONLY/
```

The assertion reads `tabs/engineering-calculation-vibration-family.js` as text and
requires the literal marker `TABLE DATA ONLY`. That marker is present nowhere in
`tabs/` or `converters/` on this checkout, and `git log -S"TABLE DATA ONLY" --all -- tabs/`
returns no commit, i.e. the string has no history in that path. The assertion is
therefore unsatisfiable as written on current `main`.

### Failure B — `engineering-calculation-console-fit-preflight.test.mjs`

Test: *VIB family shows FIT production, AIV screening and four blocked mechanisms*
(`tests/engineering-calculation-console-fit-preflight.test.mjs:58`, failing assertion at
line 72).

```
Expected values to be strictly equal:
6 !== 4
```

Registry state is consistent with the earlier assertions in the same test, which pass:

- total VIB definitions = 6 (FIT + AIV + 4 pending) — matches;
- blocked VIB definitions = 4 (`VIB.SBC.SMALL_BORE`, `VIB.CAVITATION.FLASHING`,
  `VIB.SURGE.MOMENTUM`, `VIB.SLUG.TIME_HISTORY`) — matches;
- rendered `>BLOCKED<` occurrences in the family-landing HTML = **6**, expected 4.

So the count of blocked *definitions* is correct and the rendered markup emits two extra
`BLOCKED` pills. This is either a landing-render regression or a stale expectation; it
has not been diagnosed further here because it lies outside the bolted-joint programme.

Both test files were last touched by `db5f9e2` (#684); neither
`tabs/engineering-calculation-vibration-family.js` nor these tests have changed since.

## Disposition

- P0 sub-goal *"UG-44 and the three bolt/registry suites on an exact current-main
  checkout"*: **met** (64/64).
- P0 sub-goal *"Engineering Calculation Console acceptance"*: **not met** on current
  `main`, blocked by the two vibration-family failures above.

No fix is applied here. Changing vibration-console rendering or relaxing a vibration
assertion is outside `ENGCALC-BOLTED-JOINTS` authority and must be handled as separate,
owned vibration work. Until it is, console acceptance for the bolted-joint programme
cannot be signed off, and P1 (controlled source qualification) should not be treated as
unblocked by console evidence.

## Reproduction

```bash
git checkout 541d92b480756c031a30c4e9101b4ec29df1e08d
node --test \
  tests/flange-ug44-core.test.mjs \
  tests/flange-ug44-registry.test.mjs \
  tests/flange-master-store.test.mjs
node --test tests/bolt-*.test.mjs
node --test tests/engineering-calculation-console-*.test.mjs
```
