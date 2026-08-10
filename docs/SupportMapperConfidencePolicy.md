# Support Mapper Confidence Policy

Support-kind confidence is derived from the evidence and matching mode.

| Evidence | Class | Score |
|---|---:|---:|
| Explicit semantic phrase/canonical kind (`GUIDE`, `LINE STOP`, `AXIAL STOP`, `DIRECTIONAL ANCHOR`, `PIPE REST`, `REST`, etc.) | HIGH | 0.98 |
| Longer non-canonical alias | MEDIUM/HIGH | 0.75–0.90 |
| Short/prefix code (`GT`, `ST`, `PG`, `LS`) | LOW | 0.45 |

Decision policy:

1. Split `|`-delimited trace text into physical support occurrences and retain `NAME=...` identity.
2. Score every matching alias within one occurrence.
3. A unique strongest kind is selected.
4. Lower-confidence competing kinds are retained in `suppressedCandidates` but are not mapped again.
5. Equal-strength conflicting kinds are `ambiguous` and require review.
6. Persisted GT/ST fallback rules have priority 900/910 so explicit semantic support rules run first.

The mapper preview is the audit surface and includes occurrence, evidence, chosen support/CII kind, confidence class, numeric score, alias/mode, suppressed candidates, status, and decision basis.
