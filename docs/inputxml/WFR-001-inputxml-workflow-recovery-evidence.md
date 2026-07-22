# WFR-001 — InputXML workflow recovery evidence

## Authority

- Work Pack: `WFR-001 — Restore InputXML protected workflow gates`.
- Operating mode: `SCOPE_LOCKED_IMPLEMENTATION`.
- Accepted programme baseline: PR #248 final head `31dede5a92006d7fcf4a74ee2b90d28ef8ee5dca`.
- Accepted merge commit: `c23f49c6d5a0e2fab392c08a52d125966fd43fa9`.
- Current live `main` at start: `ff6b2fc4ad37d6ead3bedf0e55aa6ed64258a370`.
- Recovery branch: `fix/inputxml-workflow-protection-recovery`.
- Initial restoration head: `4c5cd57fd95ce0832d51963f2e9f58e50feaaba8`.

No repository-level `AGENTS.md`, `.github/AGENTS.md`, or `CONTRIBUTING` file was found. WFR-001 is therefore the controlling restoration instruction. The available GitHub connector does not expose branch-protection or repository-ruleset configuration; this is recorded as configuration visibility unavailable, not as an assertion that no protection exists.

## Ancestry and source-reality audit

`main` is 36 commits ahead and zero behind the accepted PR-8 merge. The merge base is exactly `c23f49c6d5a0e2fab392c08a52d125966fd43fa9`.

The complete accepted-merge-to-current-main diff contains workflow deletions plus `docs/fbxsample`. It contains no changes under `scripts/**`, `converters/**`, `contracts/**`, `tabs/**`, `tests/**`, `node-history/**`, `Benchmarks/**`, package manifests, schemas, registries, or the production CII writer. Therefore no post-PR-8 source change requires workflow semantic adaptation in WFR-001.

## Deletion audit

| Workflow | Deletion commit | Commit form | Permanent-removal authority found |
|---|---|---|---|
| `inputxml-assurance-ledger.yml` | `892e67ea34b4effc84a4760b710253f28289165c` | direct single-file deletion, generic message | No |
| `inputxml-canonical-compiler.yml` | `9c76887f905b1c67e24be16c2bd2a5080a14a5de` | direct single-file deletion, generic message | No |
| `inputxml-cii-assured-projection.yml` | `7c548b95817c41bd642cab046d0821d7524ed6e4` | direct single-file deletion, generic message | No |
| `inputxml-contract-catalogs.yml` | `d3e3c9ee9a60f0f9dacf723cc077ec3cfa1c3601` | direct single-file deletion, generic message | No |
| `inputxml-e2e-regression-matrix.yml` | `586424a3af90c1e5682b5c99aa309029a67363b6` | direct single-file deletion, generic message | No |
| `inputxml-schema-suite.yml` | `fd3a08b028a8febe453439b9fe809d373f720761` | direct single-file deletion, generic message | No |

Repository issue and PR searches found the accepted InputXML programme authorities and no later accepted issue, PR, ADR, or maintenance decision authorizing permanent removal of these six gates.

## Accepted and restored identity

The restoration tree uses the exact accepted Git blob IDs from merge commit `c23f49c6d5a0e2fab392c08a52d125966fd43fa9`. Git blob equality proves byte identity before branch publication. Independent local SHA-256 values were calculated from files whose locally recomputed Git blob IDs exactly matched the accepted blob IDs.

| Workflow | Accepted blob SHA | Restored blob SHA | SHA-256 | Semantic diff |
|---|---|---|---|---|
| `inputxml-assurance-ledger.yml` | `19c10c34639e1e3e5a8d9ab033312fdafc10a136` | `19c10c34639e1e3e5a8d9ab033312fdafc10a136` | `62bef71378f6e4de18879fad974ff6364172fff6865171e5e6e6f8cc920dad41` | none |
| `inputxml-canonical-compiler.yml` | `dd4e6ca9a2d32a3e5140e0003bbc6b12747bd1e6` | `dd4e6ca9a2d32a3e5140e0003bbc6b12747bd1e6` | `343b67e1e8fae23feb1e5d24690afa50e6e2a7fe79bd392c0b256dad855ac2fd` | none |
| `inputxml-cii-assured-projection.yml` | `08cc6192a5ef70538a02af95830b48d78b8630a7` | `08cc6192a5ef70538a02af95830b48d78b8630a7` | `4a07d691954918f9fbc4472ff12fac2bd939d5e9698c49fe703de4d0c41055aa` | none |
| `inputxml-contract-catalogs.yml` | `59bec34449ac1de6750cbe3a07fd033c789af211` | `59bec34449ac1de6750cbe3a07fd033c789af211` | `ed176ac80cb428b97c615cc9cddeb479a762634d8b45f32bb2f0260616464fa3` | none |
| `inputxml-e2e-regression-matrix.yml` | `7e5660c1c3f2d09958ee870e540b6de6577f1403` | `7e5660c1c3f2d09958ee870e540b6de6577f1403` | `b45d5250f88b7f7d53bc82da2e8a01a3edda6d1e419bcb4d81800a85feef78a6` | none |
| `inputxml-schema-suite.yml` | `773ce66ce8a7a345428dea6ee21bd1d7ce569df5` | `773ce66ce8a7a345428dea6ee21bd1d7ce569df5` | `029633c2640584f15b7f6dcc8c413fd6da8e6537fa188c2ef1ed7d52358a0e2d` | none |

## Static validation

- Six YAML documents parsed successfully.
- Six workflow names are unique.
- Every workflow retains its own file in `pull_request.paths`.
- No stale branch or feature-branch assumption was found.
- No accepted workflow grants write permission.
- Accepted checkout actions remain unchanged.
- The Canonical Compiler retains Ubuntu and Windows deterministic jobs.
- The direct canonical compiler CLI smoke remains present.
- The protected managed-stage and PDF Input Echo test lists remain present.
- The E2E workflow retains two accepted `continue-on-error: true` steps and the mandatory final aggregate success gate; no new permitted failure was introduced.
- The E2E launcher remains `tests/test_inputxml_pdf_input_echo_e2e_matrix.py`.
- The current matrix test still asserts 14 registered dialects, 14 cases, 12 full-chain passes, two expected canonical blocks, and zero failures.

## Adversarial audit

Focused local hash and structure checks proved:

1. Removing any one workflow changes the required six-file set.
2. Changing an accepted command changes its SHA-256.
3. Removing `windows-latest` is detected structurally and changes the workflow hash.
4. Adding `continue-on-error` changes the accepted count and workflow hash.
5. Replacing the PR-8 matrix launcher is detected; existing matrix assertions enforce the 14-case population.
6. Changing `actions/checkout@v4` changes the accepted workflow hash.
7. Removing a workflow's own path filter is detected structurally and changes the hash.
8. Final acceptance requires every workflow run's `head_sha` to equal the immutable final branch head; stale-head runs are not accepted.

## Local replay

The execution container has Python, Node.js, Git, and PyYAML, but has no authenticated `gh` CLI, no repository checkout, and no external network resolution. Therefore the following feasible local work was completed:

- exact Git-blob reconstruction and SHA-256 comparison;
- YAML parsing and job/path/name validation;
- GitHub-expression delimiter validation;
- command/test-list extraction and static validation;
- accepted failure-behavior verification;
- eight required adversarial hash/structure checks.

Full repository command replay is not represented as local platform proof. It was delegated to the restored GitHub Actions workflows.

## GitHub Actions qualification — blocked before execution

All six restored workflows were created on initial restoration head `4c5cd57fd95ce0832d51963f2e9f58e50feaaba8`, but every job failed before its first step. Job payloads contain `steps: none`; no checkout, setup, validator, test, Ubuntu proof, or Windows proof executed. No job log blob or diagnostic artifact was produced. A focused rerun of InputXML Contract Catalogs reproduced the same no-step failure.

| Workflow | Run ID | Job IDs | Result | Execution evidence |
|---|---:|---|---|---|
| InputXML Schema Suite | `29882311771` | `88805591902` | FAILURE | zero steps |
| InputXML Contract Catalogs | `29882311825` | initial `88805592051`; rerun `88805885269` | FAILURE | zero steps on both attempts |
| InputXML Canonical Compiler | `29882311858` | Ubuntu `88805592280`; compiler `88805592282`; Windows `88805592319` | FAILURE | zero steps in all jobs |
| InputXML Assurance Ledger | `29882311809` | `88805592029` | FAILURE | zero steps |
| InputXML Assured CII Projection | `29882311802` | `88805591974` | FAILURE | zero steps |
| InputXML End-to-End Regression Matrix | `29882311792` | `88805591947` | FAILURE | zero steps |

Ubuntu deterministic proof: **NOT EXECUTED — infrastructure/scheduling blocker**.  
Windows deterministic proof: **NOT EXECUTED — infrastructure/scheduling blocker**.  
Dialect matrix: **NOT EXECUTED — infrastructure/scheduling blocker**.

This failure pattern does not expose a current source or test defect because repository commands never began. The exact external Actions reason is not available through the connector: job logs return no blob and the repository-settings API for Actions/billing/runners is not exposed. The owner must inspect the Actions run banner and repository/account Actions availability before qualification can continue.

## Exact-head containment and disposition

- Evidence update head: the commit containing this document; the exact SHA is frozen in draft PR #255 after this write because a file cannot contain its own commit SHA without changing that SHA.
- Changed files: the six authorized workflow files plus this evidence document only.
- Source-code changes: zero.
- Test changes: zero.
- Schema/registry changes: zero.
- CII writer changes: zero.
- Workflow semantic drift from accepted PR-8 merge: zero.
- Unresolved blocker: GitHub Actions jobs terminate before execution.
- Merge recommendation: **DO NOT MERGE**. Restore Actions execution, rerun all six workflows on the then-current exact head, obtain independent owner review, and only then reconsider merge.

## Programme boundaries

Production code: **UNCHANGED**  
Tests: **UNCHANGED**  
Schemas and registries: **UNCHANGED**  
Production CII writer: **UNCHANGED**  
PR-9: **NOT STARTED**  
Migration: **NOT AUTHORIZED**  
Merge: **NOT AUTHORIZED WITHOUT OWNER REVIEW**
