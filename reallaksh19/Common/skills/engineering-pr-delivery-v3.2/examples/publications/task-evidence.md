# Golden example — TASK_EVIDENCE

```text
TASK_EVIDENCE

OBSERVED AT
<timestamp>

EXACT HEAD / BASIS
PR #304 @ <head>
base main@<sha>

CLAIM
The post-hydration rollback evidence gap is closed, but executable certification has not run.

EVIDENCE
- regression test ref
- hosted jobs: steps=null / no logs
- local checkout attempt: repository unavailable

RESULT
PARTIAL

VERIFICATION
- rollback regression: PASS / CURRENT_TASK
- hosted certification: NOT_RUN / INFRASTRUCTURE
- local certification: NOT_RUN / INFRASTRUCTURE

CONSEQUENCE
No further product-code change is justified yet.

DEPENDENCY DISCOVERED
Execution-capable checkout / runner.

PLAN CONSEQUENCE
NONE

EXPECTED NEXT OBSERVABLE
Exact-head certification executes or exposes the first task-owned executable defect.
```

## Machine-readable core (DELP) — what the agent actually publishes

The prose above is for humans. The projector reads only the fenced block below; a block that carries a percentage, title, weight, frontier count, activity epoch or parent/programme number is rejected and moves nothing. Progress, titles and the activity epoch are recomputed from these facts and the live candidate.

```yaml
CHECKPOINT_FACTS_V1:
  responsibility: {issue: owner/repo#304}
  material: {pr: owner/repo#304, candidate_sha: 0123456789abcdef0123456789abcdef01234567}
  units:
    - id: U01
      state: COMPLETE
      result: PARTIAL          # certification has not run: the unit is complete but not VERIFIED
      evidence_refs: [owner/repo#304#issuecomment-1]
  activity: WAITING_EXTERNAL
  next: {unit: U02, action: exact-head certification executes}
  blocker: Execution-capable checkout / runner
  owner_action: NONE
```
