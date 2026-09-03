CHAIN_STATE_VERSION: 3
CHAIN_ID: ROADMAP-BROWSER-NODE-CRYPTO-IMPORTMAP
MISSION: Restore the hosted Roadmap rendered Chromium regression by aligning its standalone fixture with the application node:crypto import-map contract.
ACTIVE_ENDPOINT: EP-0001
ACTIVE_ENDPOINT_FILE: agents/chains/ROADMAP-BROWSER-NODE-CRYPTO-IMPORTMAP/endpoints/EP-0001.md
BRANCH: fix/vibration-roadmap-browser-importmap-20260903
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
WORK_ITEM_KEY: owner-direct:reallaksh19/3D_Converters:roadmap-browser-node-crypto-importmap
WORK_ITEM_MODE: EXCLUSIVE
AUTHORITY_DOMAIN: ROADMAP_BROWSER_TEST_HARNESS_IMPORTMAP_ONLY
COMMON_PROTOCOL: engineering-pr-delivery-v2
COMMON_PROTOCOL_BASIS: 293a3db7993a6945c01adc592a7ff14a339c504a
OWNER_DIRECTIVE: 2026-09-03T13:28:54Z — proceed next
ROOT_CAUSE: The standalone Roadmap Chromium fixture imports the Roadmap controller without the application import map. Its project-schema dependency graph statically imports node:crypto, so Chromium attempts unsupported direct node:crypto loading even though the actual application shell maps that specifier to core/browser-node-crypto.js.
PATCH_SCOPE: Add the application-equivalent node:crypto import-map entry to tests/browser/vibration-roadmap-interaction.html only.
PRODUCTION_CHANGE: NONE
NUMERICAL_CHANGE: NONE
ENGINEERING_AUTHORITY_CHANGE: NONE
WORKFLOW_CHANGE: NONE
HOSTED_ROADMAP_NODE_STATUS: PRIOR_PASS_29_OF_29
HOSTED_ROADMAP_RENDERED_CHROMIUM: PRIOR_FAIL_NODE_CRYPTO_IMPORTMAP_CORS
RELEASE_STATE: RELEASE_NOT_QUALIFIED
EXACT_NEXT_ACTION: Back up the existing fixture and backup registry, add the node:crypto import map to the fixture, open a draft PR, and execute/inspect the existing hosted Roadmap UI regression.