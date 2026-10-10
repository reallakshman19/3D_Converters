# LFJ H06 — exact-head local qualification without GitHub Actions

This is a **research-only, local-source test runner**, not a product-release authorization, replacement for an independent #141 reviewer, or a green GitHub Actions check. It must run from the **root of a complete local checkout** of `reallakshman19/3D_Converters`, on a machine with Node >=22 and Git. It does not download test dependencies or use network installs.

### Run it

```bash
# From the repository root, at your exact checked-out candidate commit:
git rev-parse HEAD

# Smallest rigorous original-source test suite (includes H05/H04/H02/H01/A140):
node lfj/qualification/experiments/consumer-sparse-b0-xml-match/lfj-local-qualification.mjs \
  --expected-head="$(git rev-parse HEAD)" --mode=source

# Original immutable full ledger and both CSV output oracles (Firstpass + 10MB negative):
node lfj/qualification/experiments/consumer-sparse-b0-xml-match/lfj-local-qualification.mjs \
  --expected-head="$(git rev-parse HEAD)" --mode=golden

# Native Chromium: requires existing local playwright package + Chromium executable;
# uses a temporary localhost:4200 read-only HTTP server; no npm install performed:
node lfj/qualification/experiments/consumer-sparse-b0-xml-match/lfj-local-qualification.mjs \
  --expected-head="$(git rev-parse HEAD)" --mode=browser

# All real Node/browser checks and source/fixture custody in one command:
node lfj/qualification/experiments/consumer-sparse-b0-xml-match/lfj-local-qualification.mjs \
  --expected-head="$(git rev-parse HEAD)" --mode=all \
  --report=/tmp/lfj-local-evidence.json

# Safe harness self-test only; can run without a repository:
node lfj/qualification/experiments/consumer-sparse-b0-xml-match/lfj-local-qualification.mjs --self-test
```

### What a PASS really means

The runner pins the complete 40-character Git HEAD, verifies no tracked worktree edits, independently hashes five **original** JSON/XML inputs against immutable byte-size and SHA256 fixtures **before and after** running tests, and emits `LFJ_LOCAL_EVIDENCE_V1` JSON at a path **outside the repository** (default OS temporary directory). Any missing source, mismatched HEAD, dirty tree, failed assertion, missing local Playwright/Chromium, or changed input causes nonzero exit and a `FAIL`, `BLOCKED` or `LOCAL_INCOMPLETE` result — never a false green. Untracked package caches don't change tracked-source custody; original protected inputs are re-hashed.

- **`source`**: runs H05 metamorphic XML, H04 CSV non-invocation, H02 scoped branch, H01 strict coordinate, A140 semantic attestor, structural input integrity, and B0-09 population census using actual local Node scripts
- **`golden`**: runs original Firstpass **216/164** and 10MB large negative **3429/0** full ledger and both CSV SHA/byte oracle checks; original smaller ExpectedXML is also hashed and B0-07 browser mode verifies its output
- **`browser`**: runs native A140/H01/H02 negative Worker tests plus B0-07 five authentic/derived Chromium XML→CSV modes, on localhost port 4200, using existing Playwright and installed Chromium only

`--mode=all` reports `LOCAL_FULL_PASS` **only** after every specified local source, full golden and browser check passes. This is still **local author evidence**, not GitHub Actions, protected independent #141 acceptance, Agent B 30/90MB runtime qualification, Agent C production integration, or Owner release authorization. The evidence JSON always records `githubCiPassed:false`, `independentOracleAccepted:false`, `engineeringReady:false`, `downloadAuthorized:false`, and `appWired:false`.

### Executed proof and limitations at H06 author checkpoint

The exact H06 Node script passed `--self-test` on local **Node v22.16.0** (5/5 invariants). Two real synthetic local Git worktrees were used to falsify qualification: a clean exact-HEAD checkout **without five authentic benchmark files** returned exit code **1**, `BLOCKED_OR_INVALID_SOURCE` with five `BLOCKED` fixture results and no executed source tests; the same synthetic checkout when given an **incorrect expected HEAD** returned exit **1** and explicit `exact_git_head: FAIL`. The actual local script's Git blob hash was independently matched to the published H06 GitHub commit.

**The author sandbox did not contain a complete current repository checkout, even though local Node is installed.** Its terminal could not resolve GitHub DNS, and therefore the H06 **real** fixture-backed Node/Chromium/full-ledger runs were **NOT_RUN**, not passed. Previous H05/H04 source V8 validations and H02 older-head genuine CI are distinct evidence and do not qualify this new exact SHA. This file introduces **no GitHub Actions workflow** and no changes to the originals, protected golden module, shipping Resolver or product permissions.
