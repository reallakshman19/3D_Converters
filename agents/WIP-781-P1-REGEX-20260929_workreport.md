# WIP-781-P1-REGEX-20260929 — Issue #781 Token Builder evidence transport

## Basis

```text
ISSUE = #781
PLAN = IMPLEMENTATION_PLAN rev 1 / issuecomment-5893573324
BASE_MAIN = 7057e3d031663fbe92c22f4a3b8c98cc32d06e7b
BRANCH = agent/issue-781-p1-regex-evidence-20260929
CRITICALITY = ENGINEERING_CRITICAL
PROTOCOL = V3.1 / Common@1ced68258afeaf50df113b1d38a4ceb9193587e3 / TPG-2P-2026-09-28-R3
MERGE_AUTHORITY = OWNER_ONLY_NOT_GRANTED
```

## Current-head RCA

The repository already has a substantial smart Regex/Token Builder scorer. It classifies token shapes, clusters complete signatures, validates line-key candidates against line-list identities, validates piping classes and class bores, and separates master-backed evidence from heuristics.

PR #780 intentionally converted master state to dataset references and bounded UI data. `masterContext.lineRows` and `masterContext.pipingClassRows` are therefore normally empty even when authoritative datasets are loaded. The current smart UI still passes those resident arrays directly to `buildRegexSuggestionPreflight()`, starving the existing scorer of its master evidence.

A second custody defect exists in preflight caching: cache/fingerprint identity uses row counts and mapping revisions but not whether authoritative rows were actually present. A heuristic receipt computed with empty resident arrays can therefore be reused after transient master rows become available if counts/revisions did not change.

The basic extraction tester also labels any non-empty `lineKey + pipingClass` row as `MATCHED`, which overstates semantic validation.

## Intended correction

1. Materialize only Line List and Piping Class datasets transiently for smart Regex operations, following the existing Weight Match dataset materialization precedent.
2. Never persist those full rows back into `state.masterContext`.
3. Build the existing smart preflight against the transient evidence context and retain only the compact receipt/evidence basis.
4. Separate heuristic and master-backed preflight cache/fingerprint identities.
5. Preserve the existing inference/scoring algorithm and thresholds unless executable evidence proves an algorithm defect.
6. Replace the generic row label with semantic statuses: `EXTRACTED`, `MASTER_VALIDATED`, `REVIEW_REQUIRED`, `REJECTED`, while preserving compatible extraction-row collections for existing UI/coverage consumers.

## Falsifiers

- fix requires persistent full master arrays on the main UI thread;
- new code duplicates/replaces the existing scorer instead of reconnecting evidence;
- heuristic-only receipt can auto-apply as if master-backed when dataset refs exist;
- receipt cache treats empty evidence and hydrated evidence as identical;
- dataset materialization touches unrelated masters;
- semantic status marks rows master-validated without exact master evidence;
- PR780 dataset/scale or #776 authority regressions are newly introduced.

## Exact next action

Create exact pre-edit backups, implement the transient evidence helper and cache-basis fix, then qualify the existing scorer against dataset-backed evidence before changing any recommendation algorithm.
