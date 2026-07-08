# XML CII service fallback and workflow build controls

This branch continues after PR #65 was merged.

Changes on this branch:

- Wire the service-only process fallback resolver into `resolveBranchProcessData()` so Preview can receive fallback process values before the old process-default path is evaluated.
- Add 5B Topology controls in the workflow bridge:
  - `Build Topology Audit`
  - `Refresh latest audit`
- Add a delegated JsonNode Trace tree build patch:
  - injects `Build Json trace`
  - auto-builds once when staged JSON is available on the Json Trace view

This note is non-runtime documentation for the follow-up PR.
