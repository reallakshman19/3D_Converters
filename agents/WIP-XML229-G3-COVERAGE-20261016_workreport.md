# PR G3 coverage — recovery-first handover · 2026-10-16

Owner direct request: "merge and proceed in pending once, update detailed status and future action in your issue."

### Source and merge custody
#276 merged to main via exact GitHub merge commit `9ce582ead21b2682e3765f69c7e90a1d298a3b77`, with original-JSON native CII HELD unmodified. At final premerge #276 61/70 GitHub checks passed; nine failed workflows (LFJ W06/W07/W10/W11/W15, C05 #835/#884, C06 #905, FBX Live UI). They are not declared resolved, ignored or waived. Current main advanced to `db8f7f012682113578cfaf107faa6986fa0d402c` when this G3 branch was created; inspect live main to verify subsequent changes rather than claiming exclusive ownership.

### Work performed — one pending G3 slice
New source+served `xml229-candidate-coverage-report.mjs` and one read-only Worker RPC. Reuses attested complete physical population, existing verified `weightProjection` and actual GC-PW scorer/ledger. Source-first aggregate only: 0/1/multi, qualified/unqualified, positive/null/invalid source kg, separate accepted Match-1 and Final with revisions. No candidate row values/IDs/private master/source bytes cross to UI; always review/native authority false. New client method `readCandidateCoverage()`; real Chromium original Blob acceptance-before/after assertions and eight isolated negative/coverage tests imported into P4 Node qualification. All source+docs mirror modifications identical. No new scorer/acceptance code and no native converter changes.

### Claims and risks
The 423 physical / 2961 FactRecord Owner screenshot previously established source mass unresolved (0 positive source, 0 Match-1, 0 Final), **NOT candidate coverage**. This new code does not infer actual qualified candidates; no Owner private workbook/XML/JSON has been provided to these tools. Tests are authored, exact-head CI before new PR is **NOT_YET_VERIFIED**, and no actual CII output native physical-slot proof is claimed. The bounded 100000 physical-report limit is a fail-closed diagnostic CPU guard, not 100MiB/2m source ingestion policy.

### Next step
Create draft PR on updated main; run exact G3 P4 Node22/24 and Chromium, classify any regressions against the merged main head. Publish concise source-level aggregate census receipt from Owner-provided controlled execution without raw artifacts. Then complete actual-JSON G2 cold time/peak memory + G4 canonical UI parity and G5 independent native physical-slot kg/unit/split correspondence. Do not silently auto-review, auto-accept, enable Run, claim final v3.6 label approval, or deploy new code before validation.
