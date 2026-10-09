# PLAN_FOR_LOCAL_AGENT_V1

Use this template whenever the Owner/coordinator says **"Plan for local agent"** or an equivalent explicit request to prepare an RLL-1 local-agent execution plan.

This template is a planning/staging operation. It does not itself grant merge, release, acceptance or engineering authority beyond the already-governing task.

## 0. Live basis refresh

Before filling the plan:

1. resolve current `reallaksh19/Common@main`;
2. re-read Engineering Relay V3.1;
3. re-read current Two-Pass schema;
4. re-read the governing parent/child issue;
5. refresh current repository main/head/PR/branch state;
6. inspect existing RLL labels/state/comment if any;
7. inspect whether the repository already contains an RLL adapter.

Record:

```text
PROTOCOL BASIS
V3.1
Common@<current-main-sha>
<Two-Pass revision>

REPOSITORY BASIS
repository: <owner/repo>
main: <sha>
governing_issue: #<n>
owned_branch_or_exact_head: <ref>
```

If material facts changed, update the plan before staging RLL.

## Existing repository protocol discovery — mandatory

The exact Owner keyword **"Plan for local agent"** does not mean "install a new protocol."

Before selecting an executor or scaffolding anything, inspect the target repository for existing local-agent/RLL authority and adapter material, including repository rules, scripts, installers, scheduler configuration, docs, source guards, live issue envelopes, and Common-basis pins.

Classify exactly one:

```text
PRESENT_CURRENT_COMPATIBLE
PRESENT_CURRENT_NEEDS_BLUEPRINT_DELTA
PRESENT_STALE_OR_INCOMPATIBLE
ABSENT
```

Apply these rules:

- `PRESENT_CURRENT_COMPATIBLE` -> **REUSE**. Keep the repository protocol as the primary implementation. Do not scaffold a duplicate adapter or migrate executors merely because a newer blueprint exists.
- `PRESENT_CURRENT_NEEDS_BLUEPRINT_DELTA` -> **AUGMENT_MINIMALLY**. Preserve the repository protocol and use the relevant Common blueprint only to fill the missing capability or safety boundary.
- `PRESENT_STALE_OR_INCOMPATIBLE` -> **UPDATE_IN_PLACE** when practical. Preserve repository-specific integration and replace only stale/incompatible transport pieces.
- `ABSENT` -> **SCAFFOLD** the standard thin adapter.

A repository-local protocol is "compatible" when it preserves V3.1 authority, RLL transport/result separation, Git material truth, independent review, and the required executor/security invariants for the requested job.

Never create a second competing local-agent protocol when the existing one can truthfully perform the requested job.

## Executor profile

Choose the local executor only after repository protocol discovery.

For Codex, use `templates/rll-codex-local-blueprint.md` **if required**:
- when the repository has no Codex/RLL implementation;
- when its Common basis or Codex adapter is stale/incompatible;
- when it lacks a required Codex safety boundary such as provider/credential isolation, `allowed_paths`, WSL/Linux source-write qualification, launcher-owned commit/push, structured output, or smoke gating;
- when the Owner explicitly requests migration to Codex.

If the existing repository protocol already satisfies the Codex blueprint invariants, do not re-scaffold it. Use the blueprint as a conformance checklist and record `blueprint_required: false`.

For legacy Antigravity compatibility, retain the existing adapter rules until that executor is separately retired or migration is explicitly authorized.

## 1. Classify the local-agent job

Choose exactly one mode.

### A. BRANCH_RESUME

Use when the local agent owns bounded material implementation on an existing/declared branch.

Required facts:

```yaml
mode: BRANCH_RESUME
branch: <owned-branch>
base_sha: <approved-base>
allow_material_write: true
```

The local agent resumes the real branch material head. It must not reset legitimate prior commits to the original base.

### B. EXACT_HEAD_EVIDENCE

Use when the local agent should execute read-only validation/diagnostics against one immutable candidate.

Required facts:

```yaml
mode: EXACT_HEAD_EVIDENCE
head_sha: <exact-candidate>
base_sha: <comparison-base>
allow_material_write: false
```

The deterministic launcher uses a dedicated detached worktree and must return it clean at the exact declared head.

If neither mode truthfully fits, do not invent a third mode. Keep execution interactive or publish a V3.1 plan update first.

## 2. Confirm adapter availability

Check the target repository for the standard thin adapter:

```text
.agents/rules/rll-1.md
scripts/rll1-antigravity-worker.ps1
scripts/install-rll1-antigravity-sidecar.ps1
docs/RLL1_LOCAL_AUTOMATION.md
```

A repository may additionally carry an adapter source guard.

If the adapter exists:
- verify it consumes Common V3.1 RLL rather than duplicating the protocol;
- verify its required Common basis is current enough;
- verify it uses native git + gh and no GitHub MCP dependency.

If the adapter does not exist:
- scaffold it from `templates/rll-adapter/` using the Common helper;
- keep repository-specific content thin;
- do not copy `rll_worker.py`, state-machine logic, schemas or lease logic into the consumer repository.

## 3. Engineering contract

Retain the already-governing engineering contract.

The local-agent plan MUST state:

- purpose / owned outcome;
- exact basis;
- source truth;
- current first falsifier or reason for execution;
- in-scope surfaces;
- protected/non-goal surfaces;
- exact commands or bounded technical steps when already known;
- engineering success conditions;
- engineering FAIL/BLOCKED/NOT_RUN distinctions;
- exact return/evidence contract;
- stop/escalation conditions.

Do not collapse engineering result into RLL transport state.

## 4. Machine execution envelope

Publish one authorized execution envelope on the governing issue.

### Branch implementation

```yaml
RLL_EXECUTION_V1

transport: RLL-1
worker: antigravity-local
mode: BRANCH_RESUME
repository: <owner/repo>
branch: <owned-branch>
base_sha: <approved-base-sha>
allow_material_write: true
```

### Exact-head evidence

```yaml
RLL_EXECUTION_V1

transport: RLL-1
worker: antigravity-local
mode: EXACT_HEAD_EVIDENCE
repository: <owner/repo>
head_sha: <exact-sha>
base_sha: <comparison-base-sha>
allow_material_write: false
```

The envelope must be authored by an identity authorized by the local adapter.

## 5. Transport controls

RLL transport labels remain:

```text
rll-ready
rll-active
rll-review-ready
rll-escalation
```

Do not invent transport labels that imply PASS/FAIL/completion.

Ordinary comments are non-executable context.

Transport control uses only authorized structured directives:

```yaml
RELAY_DIRECTIVE_V1

sequence: <monotonic-integer>
issue: <issue-number>
action: CONTINUE | PAUSE | RESUME | REPLAN | CANCEL
instruction: >
  <bounded transport/continuation instruction>
```

## 6. Activation plan

Default activation is smoke-first.

Plan:

```text
adapter present/current
→ Common basis verified
→ local git/gh/agy/Python prerequisites verified
→ sidecar installed in smoke mode
→ confirm pilot issue is OPEN and has never reached REVIEW_READY/CANCELLED
→ rll-ready applied to that bounded pilot
→ timer wake proves issue discovery + mutex + worker-state mutation
→ overlap/reentrancy check
→ smoke reviewed
→ engineering execution explicitly enabled
→ local agent executes bounded issue
→ exact evidence published
→ rll-review-ready
→ independent V3.1 review
```

Never reopen or reuse completed/review-ready work merely to obtain a smoke target. If the originally planned pilot completed before RLL activation, choose the next genuinely open bounded task or create a dedicated non-engineering smoke issue.

Before unattended activation, require browser-based `gh auth login --web` backed by the OS credential store. Do not persist GitHub tokens in sidecar/config files or prompts. Configure Antigravity through its documented Tool Permission setting; do not synthesize wildcard grant entries.

For an already-proven repository adapter, later jobs may skip reinstall/smoke only when the local environment and adapter basis are unchanged and healthy.

## 7. Required plan output

When responding to the Owner after "Plan for local agent", produce a concise plan containing:

```yaml
schema: plan-for-local-agent/v1

protocol_basis:
  relay: V3.1
  common: <sha>
  two_pass: <revision>

repository:
  name: <owner/repo>
  main: <sha>
  governing_issue: <number>

existing_local_agent_protocol:
  status: PRESENT_CURRENT_COMPATIBLE | PRESENT_CURRENT_NEEDS_BLUEPRINT_DELTA | PRESENT_STALE_OR_INCOMPATIBLE | ABSENT
  sources:
    - <repo path / live provider source>
  selected_action: REUSE | AUGMENT_MINIMALLY | UPDATE_IN_PLACE | SCAFFOLD
  reason: <why this classification is true>

blueprint:
  codex_blueprint_required: true|false
  reason: <missing delta or "existing protocol already conforms">

adapter:
  status: PRESENT_CURRENT | PRESENT_STALE | ABSENT
  action: REUSE | UPDATE | SCAFFOLD
  required_common_basis: <sha>

execution:
  mode: BRANCH_RESUME | EXACT_HEAD_EVIDENCE
  branch: <value|null>
  head_sha: <value|null>
  base_sha: <sha>
  material_write: true|false

purpose: <bounded outcome>
first_falsifier_or_reason: <text>
steps:
  - <bounded step>
validation:
  - <required evidence>
protected:
  - <must not change>
return_contract: <typed result/evidence requirement>

activation:
  smoke_required: true|false
  ready_label_after: <condition>
  next_human_action: <only if unavoidable; otherwise null>

merge_release_authority: false
```

Then perform the durable staging actions that are already authorized:
- publish/update the execution envelope;
- scaffold/update the adapter when that is part of the requested planning work;
- create labels/configuration artifacts as appropriate to the repository plan.

Do not start source-writing execution merely because the plan was requested.

## 8. Review boundary

When the worker reaches `REVIEW_READY`:

1. refresh live V3.1 basis;
2. re-read material Git truth;
3. inspect exact diff / exact-head evidence;
4. classify engineering PASS/FAIL/BLOCKED/NOT_RUN independently;
5. issue `CONTINUE` / `REPLAN` if correction remains;
6. merge only on direct Owner merge authority.

## Invariant

> "Plan for local agent" means: standardize and stage the entire RLL execution contract so the local worker can act without copy/paste, while preserving V3.1 engineering authority and independent review.
