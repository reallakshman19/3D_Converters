## Mission

Fix the Flow-Induced Vibration Screening load failure:

`The requested module '../converters/vibration/project/schema.js' does not provide an export named 'vibrationProjectLifecycleLedgers'`

## Root cause

Current `main` does export both post-PR720 lifecycle APIs. The observed browser failure is consistent with ESM module-version skew: newer lifecycle consumers named-import an unversioned `schema.js`, while a browser may retain a pre-PR720 cached schema module. Named-export linking then aborts the FIV module graph before runtime error handling can execute.

## Repair

- add a small lifecycle project-schema compatibility adapter;
- cache-bust its schema import with `20260903-pr720-lifecycle-schema-1`;
- use an ESM namespace import rather than named-importing post-PR720 APIs;
- resolve lifecycle APIs only when invoked;
- missing lifecycle APIs fail closed as `VIBRATION_PROJECT_SCHEMA_LIFECYCLE_API_UNAVAILABLE`;
- route both lifecycle handoff extraction and roadmap lifecycle persistence through the adapter;
- extend the existing hosted lifecycle UI regression to cover the compatibility contract.

## Authority boundary

No FIT equation, threshold, correlation, calculation method, project schema shape, lifecycle ledger semantics, screening authority, design authority, workflow YAML, or release authority changes.

## Validation

At PR creation:

- source/diff reconciliation: PASS;
- current schema export presence: PASS / source inspection;
- exact-source Node: NOT_RUN;
- Chromium: NOT_RUN;
- hosted lifecycle regression: NOT_RUN;
- full FIV browser journey: NOT_RUN.

Validation will be updated from exact-head execution. Do not infer PASS from unexecuted checks.

## Merge authority

OWNER_ONLY / NOT_GRANTED. Draft PR; do not merge without explicit Owner authorization.
