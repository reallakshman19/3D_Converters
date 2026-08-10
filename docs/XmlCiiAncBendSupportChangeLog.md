# Change Log — ANC / Bend / Support Confidence

Implemented on a branch based directly on current `main` after empirical-weight API merge.

- Synthetic `RestrainOpenEnds` ANC is topology-aware and auditable.
- BendRadius OFF/ON contract implemented and standalone runtime activated.
- Config phase exposes `Bend radius: 1.5D`, default OFF.
- Support mapper now isolates `|` occurrences, derives HIGH/MEDIUM/LOW confidence, suppresses weaker competing kinds, and leaves equal-strength conflicts ambiguous.
- GT/ST fallback mapping priority moved to 900/910.
- Focused Python/Node regression sources added.
