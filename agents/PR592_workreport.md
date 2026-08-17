# PR #592 workreport — WEB-PAGES-PORTABILITY-01

## Mission

Prevent copied/renamed GitHub Pages deployments from silently retaining a stale repository-name asset base, as reported in #591.

## Identity

```text
issue = #591
PR = #592
base main = d971da8e28748ff56715e1a080202750d23fb99c
branch = agent/pages-portability-591-copy-safe
classification = STANDARD
overlap = SAFE
merge authority = OWNER_ONLY / NOT_GRANTED
```

## Root-cause evidence

The reported copied deployment was served beneath `/AA/` while requesting local assets beneath `/Advanced_Analysis/assets/...`, producing 404s.

The connected original `reallaksh19/Advanced_Analysis` currently contains:

```text
vite.config.js
base: '/Advanced_Analysis/'
```

That hard-coded Vite project base explains why an unchanged copy/rename can emit stale `/Advanced_Analysis/assets/...` URLs.

This PR does not modify that separate repository.

## 3D_Converters finding

Current `3D_Converters` production entry/module paths inspected from main are already relative:

```text
index.html -> ./assets/... | styles/... | ./main-rhbg-fitguard.js
main-rhbg-fitguard.js -> ./core/app.js
core/app.js -> ./... | ../tabs/...
```

Repository search also found no current `src="/`, CSS `url(/`, root-absolute module import, service-worker registration, or `/Advanced_Analysis/` asset-base pattern in the inspected production surface.

Therefore no working runtime URL was rewritten speculatively.

## Added capability

```text
node scripts/verify-github-pages-copy-safe.mjs
```

The verifier scans:

```text
index.html
main-rhbg-fitguard.js
core/**
tabs/**
styles/**
```

for deployment-relevant HTML/CSS/JS resource references.

Fail-closed classifications:

```text
ROOT_ABSOLUTE_LOCAL
GITHUB_PAGES_PROJECT_BOUND
```

It rejects examples such as:

```text
/OldRepo/assets/main.js
/OldRepo/core/app.js
https://example.github.io/OldRepo/assets/main.js
```

and permits relative project-local paths plus external/data/blob/anchor/mail/tel resources.

## Regression coverage

`tests/github-pages-copy-safe.test.mjs` contains five cases:

1. URL classifier boundary;
2. exact copied-Vite `/Advanced_Analysis/assets/...` reproduction;
3. relative HTML/CSS/module positive path;
4. root-absolute JS import/fetch fail-closed path;
5. current Pages source-surface verification entrypoint.

## Changed files

New files only:

```text
agents/WIP-WEB-PAGES-PORTABILITY-01_workreport.md
agents/PR592_workreport.md
scripts/verify-github-pages-copy-safe.mjs
tests/github-pages-copy-safe.test.mjs
```

No existing source file required editing or backup.

## Validation truth

```text
PASS     live main grounding
PASS     Pages configuration inspection: workflow build from main repository root
PASS     open-PR overlap = SAFE
PASS     current entry/module path inspection = relative
PASS     reconstructed node --check for verifier
PASS     reconstructed node --check for focused test
PASS     reconstructed focused tests = 5/5
NOT_RUN  repository-native exact-checkout verifier/test
NOT_RUN  real-browser Pages acceptance after this PR (unmerged)
```

The reconstructed 5/5 run used the exact new verifier/test source with a minimal representative local source surface. It is supporting evidence only and is not promoted to repository-native PASS.

## Protected scope

No engineering calculation, numerical method, benchmark oracle, master, vibration/FIT/AIV/SBC authority, Product Freeze, XML/CII semantics, topology, writer, canvas, export, workflow, or PR #546 technical change.

## State / exact next action

PR #592 remains draft and unmerged. Re-ground exact head/main/reviews/checks before any merge. Merge requires a new explicit Owner instruction referring to #592/current Pages portability PR.