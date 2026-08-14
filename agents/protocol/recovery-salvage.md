# Recovery, Quarantine, Salvage, and Supersession

## 1. Agent failure is normal

An agent may disappear, lose context, become incapable, produce an untrustworthy patch, or fail qualification.

The protocol must preserve validated engineering value without requiring the PR itself to survive.

## 2. Recovery mode

When an agent is lost or no longer trustworthy:

```text
FREEZE
-> SNAPSHOT LIVE STATE
-> RE-GROUND
-> ASSESS
-> QUALIFY
-> CONTINUE | SALVAGE | SUPERSEDE
```

Set production mutation to read-only until trust is restored.

## 3. Quarantine triggers

Strong reasons to quarantine include:

- work report cannot explain current diff;
- material report/HEAD divergence cannot be reconstructed;
- unrelated workstreams mixed into one branch;
- unexplained authority/tolerance/oracle changes;
- expected values changed with production code and no independent oracle;
- workaround accumulation with unclear intent;
- validated and unvalidated commits cannot be separated;
- main has advanced enough to obsolete branch assumptions;
- takeover agent cannot explain the production execution path;
- rebase/conflict resolution would require guessing engineering intent.

## 4. Salvage assessment

Record:

```text
Mission still valid?
Diff understandable?
Known-good commits identifiable?
Authority boundaries identifiable?
Independent evidence identifiable?
Unvalidated changes separable?
Main drift manageable?
Open reviews understood?
Next safe change identifiable?
```

Decision:

```text
CONTINUE
SALVAGE_PARTIAL
SUPERSEDE
ABANDON
```

## 5. Preserve value, not sunk cost

A PR may be `SALVAGE_ONLY` or `SUPERSEDE_RECOMMENDED` even after substantial work.

Preserve:

- known-good commits;
- validated fixtures/benchmarks;
- independent evidence;
- accepted `DEC-*` and `INV-*`;
- useful provenance and failed-approach history.

Reject or rebuild untrusted implementation.

## 6. Supersession

Do not delete history. Close/supersede the old PR and create a fresh PR from current `main`.

The replacement report records:

```text
predecessor PR
predecessor terminal/disposition state
reason for supersession
known-good salvaged commits/evidence
deliberately rejected work
fresh current-main SHA
fresh scope/claims
fresh Appendix A
```

Agent replacement alone is not a reason to create a new PR. Create a new PR because the work boundary or safety/recoverability boundary requires it.

## 7. Recovery decision record

Every damaged-PR takeover should record a durable recovery decision:

```text
REC-###
trigger
incoming PR/report/main state
key divergences
trust findings
salvage classification
selected/rejected commits or artifacts
replacement PR if any
engineering rationale
```

A controlled supersession is a successful engineering outcome when it is safer than continuing an unprovable branch.
