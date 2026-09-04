CHAIN_STATE_VERSION: 3
CHAIN_ID: SBC-MATRIX-PROJECTION-EVIDENCE
MISSION: Restore Stage-4 raw-SBC matrix evidence projection without changing SBC authority or calculation semantics.
ACTIVE_ENDPOINT: EP-0001
ACTIVE_ENDPOINT_FILE: agents/chains/SBC-MATRIX-PROJECTION-EVIDENCE/endpoints/EP-0001.md
BRANCH: fix/vibration-sbc-projection-evidence-20260904
BASE_MAIN: 78b361d1f649d41378f568ebe1a237c4bc140c73
STATE: ACTIVE
ENGINEERING_STATE: READY
CUSTODY_STATE: HELD
QUALIFICATION_STATE: PASS
WRITE_AUTHORITY: WRITE_ALLOWED
AUTO_STATE: PAUSED
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
WORK_ITEM_SOURCE: OWNER_PROGRESSION
WORK_ITEM_KEY: owner-direct:reallaksh19/3D_Converters:sbc-matrix-projection-evidence
WORK_ITEM_MODE: EXCLUSIVE
AUTHORITY_DOMAIN: VIBRATION_SBC_MATRIX_PROJECTION_EVIDENCE_ONLY
COMMON_PROTOCOL: engineering-pr-delivery-v2
COMMON_PROTOCOL_BASIS: 293a3db7993a6945c01adc592a7ff14a339c504a
OWNER_DIRECTIVE: 2026-09-04T08:52:16Z — proceed next
ROOT_CAUSE: SBC contract evidence contains projectionOnly=true, but the integrity-matrix SBC adapter drops item.evidence when returning non-calculated assessment projections.
PATCH_SCOPE: Preserve SBC contract item evidence on the matrix assessment only.
PRODUCTION_CALCULATION_CHANGE: NONE
NUMERICAL_CHANGE: NONE
ENGINEERING_AUTHORITY_CHANGE: NONE
WORKFLOW_CHANGE: NONE
KNOWN_STAGE4_STATUS: FAIL_49_OF_50
KNOWN_STAGE4_FAILURE: tests/vibration-integrity-mechanism-matrix.test.mjs raw SBC projectionOnly assertion receives undefined evidence
FULL_NODE_STATUS: NOT_RUN_AFTER_STAGE4_FAIL
PRODUCTION_FREEZE_CHROMIUM_STATUS: NOT_RUN_AFTER_STAGE4_FAIL
RELEASE_STATE: RELEASE_NOT_QUALIFIED
EXACT_NEXT_ACTION: Back up tabs/vibration-integrity-mechanisms.js and .backups/log.json, apply the adapter-only evidence preservation patch, open a draft PR, and run exact-head production-freeze validation.