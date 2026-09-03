CHAIN_STATE_VERSION: 3
CHAIN_ID: ROADMAP-BROWSER-NODE-CRYPTO-IMPORTMAP
MISSION: Restore the hosted Roadmap rendered Chromium regression by aligning its standalone fixture with the application node:crypto import-map contract.
ACTIVE_ENDPOINT: EP-0002
ACTIVE_ENDPOINT_FILE: agents/chains/ROADMAP-BROWSER-NODE-CRYPTO-IMPORTMAP/endpoints/EP-0002.md
LATEST_MATERIAL_LEG: LEG-001
LATEST_MATERIAL_LEG_FILE: agents/chains/ROADMAP-BROWSER-NODE-CRYPTO-IMPORTMAP/material-legs/LEG-001.md
BRANCH: fix/vibration-roadmap-browser-importmap-20260903
BASE_MAIN: 78b361d1f649d41378f568ebe1a237c4bc140c73
VALIDATION_CODE_HEAD: c798963586946424b04078958a506fa323949151
PR: 728
PR_STATE: OPEN_DRAFT
STATE: ACTIVE
ENGINEERING_STATE: READY
CUSTODY_STATE: HELD
QUALIFICATION_STATE: PASS
WRITE_AUTHORITY: READ_ONLY
AUTO_STATE: PAUSED
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
WORK_ITEM_SOURCE: OWNER_PROGRESSION
WORK_ITEM_KEY: owner-direct:reallaksh19/3D_Converters:roadmap-browser-node-crypto-importmap
WORK_ITEM_MODE: EXCLUSIVE
AUTHORITY_DOMAIN: ROADMAP_BROWSER_TEST_HARNESS_IMPORTMAP_ONLY
COMMON_PROTOCOL: engineering-pr-delivery-v2
COMMON_PROTOCOL_BASIS: 293a3db7993a6945c01adc592a7ff14a339c504a
OWNER_DIRECTIVE: 2026-09-03T13:28:54Z — proceed next
ROOT_CAUSE: The standalone Roadmap Chromium fixture imported the Roadmap controller without the application import map. Its project-schema dependency graph statically imports node:crypto, so Chromium attempted unsupported direct node:crypto loading even though the actual application shell maps that specifier to core/browser-node-crypto.js.
PATCH_STATUS: HOSTED_NODE_AND_RENDERED_CHROMIUM_PASS
PATCH_SCOPE: tests/browser/vibration-roadmap-interaction.html adds the application-equivalent node:crypto import-map entry only.
PRODUCTION_CHANGE: NONE
NUMERICAL_CHANGE: NONE
ENGINEERING_AUTHORITY_CHANGE: NONE
WORKFLOW_CHANGE: NONE
HOSTED_ROADMAP_NODE_STATUS: PASS_29_OF_29
HOSTED_ROADMAP_RENDERED_CHROMIUM: PASS
HOSTED_WORKFLOW_RUN: 33762062715_SUCCESS
HOSTED_BROWSER_RECEIPT: VIBRATION_ROADMAP_BROWSER_REGRESSION=PASS
FULL_RELEASE_QUALIFICATION: NOT_RUN
RELEASE_STATE: RELEASE_NOT_QUALIFIED
CURRENT_BLOCKER: The demonstrated Roadmap node:crypto browser-harness blocker is closed. Whole-repository/full release qualification has not been rerun under this scope.
EXACT_NEXT_ACTION: Owner may disposition PR728. Do not merge without explicit Owner authorization. If merged, inspect/re-run broader release qualification separately before changing RELEASE_NOT_QUALIFIED.