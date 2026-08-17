# WIP — WEB-PAGES-PORTABILITY-01

## Mission

Issue #591: prevent GitHub Pages copy/rename failures where a page served under one project path requests local assets from a stale hard-coded repository base.

Observed external failure class:

```text
served page: /AA/
stale local asset base: /Advanced_Analysis/assets/...
result: 404
```

## Classification / authority

```text
classification = STANDARD
base main = d971da8e28748ff56715e1a080202750d23fb99c
branch = agent/pages-portability-591-copy-safe
overlap = SAFE
engineering authority impact = NONE
workflow edits = NONE
merge authority = OWNER_ONLY / NOT_GRANTED
```

## Current production finding

`3D_Converters` Pages is published from repository root. Current inspected production entry paths are relative:

```text
index.html -> ./assets/... | styles/... | ./main-rhbg-fitguard.js
main-rhbg-fitguard.js -> ./core/app.js
core/app.js -> ./... | ../tabs/...
```

Repository searches found no current `src="/`, `url(/`, root-absolute module import, service-worker registration, or hard-coded `/Advanced_Analysis/`-style local asset base in the inspected production surface.

Therefore this work does not rewrite working runtime paths speculatively. It adds a fail-closed portability verifier and regression tests.

## Scope

New files only:

```text
scripts/verify-github-pages-copy-safe.mjs
tests/github-pages-copy-safe.test.mjs
agents/WIP-WEB-PAGES-PORTABILITY-01_workreport.md
```

The verifier scans deployment-facing HTML/CSS/JS sources and rejects root-absolute local resource URLs/imports that bind a copied app to a repository root. External HTTP(S), data/blob, anchors, mail/tel URLs remain allowed.

## Protected scope

No changes to calculations, engineering masters, vibration/FIT/AIV/SBC authority, XML/CII semantics, topology, writers, canvas, exports, Product Freeze, `.github/workflows/*`, or PR #546 technical work.

## Validation truth

```text
PASS     live main/source grounding
PASS     overlap classification SAFE by open-PR inspection
PASS     current entry/module source uses relative local paths by connector inspection
NOT_RUN  repository-native Node verifier/tests
NOT_RUN  browser acceptance
```

Static inspection is not native execution.

## EXACT_NEXT_ACTION

Add the verifier and focused tests, inspect the resulting diff, open a separate draft PR, and keep it unmerged pending Owner authorization.