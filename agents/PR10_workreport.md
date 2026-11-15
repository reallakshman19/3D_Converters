# WIP-SOURCE-CII-TRACE-20261115 — source coverage to native CII audit trace
ENGINEERING_CRITICAL observational export only / CONTINUE from PR8. Base 326270b46f190b324f6a6f52a7602a0296d79623. Owner reported RECORDED_SOURCE rows for PS4131/PS4130 showing 'not verified' despite successful CII generation. RCA confirmed exporter never projects native addresses on coverage rows. Existing field verifier already records native mapping, code, gap, block, slot, line. Existing PR7 hardens source ownership in active-restraint-coverage.js; this PR deliberately does not touch that file or change coverage disposition, audit status, writer, geometry, or source mapping. It appends separate sealed ciiTrace after native field verification, then exports native type, gap and address. Original candidate identity + type/gap + recordId + VERIFIED native record required. All candidates must have uniquely addressable verified records; group witness explicitly does not prove independent source ownership. Exact named single-source writer attribution distinguished; missing/ambiguous native evidence remains unverified. No engineering acceptance. PR4/7 overlap audit authority, coordinate before merge; PR9 separate GT policy.

Appendix A self-assessment 94/100 (19/20,20/20,19/20,18/20,18/20): source coverage -> existing field verification -> exporter traced; actual native PR8 baseline proves node3760 14/8/9 block51 slots1/2/3, existing source rows omit CII fields; invariants no new writer/geometry or physical ownership authority; literal native slot oracle plus missing GUIDE adversarial test; surgical helper and export integration. No actual PC report or independent review. Source code only, no workflow changes; test imported into existing HOLD harness. Original backups via exact Git blobs (local checkout unavailable). Validation NOT_RUN.
EXACT_NEXT_ACTION: run exact-head HOLD and inspect PS4131_SOURCE_NATIVE_LINKS; coordinate PR4/7, do not merge without owner authorization.
Changed files:
- tabs/xml-cii-2019-standalone/xml-cii-source-native-trace.js (new)
- tabs/xml-cii-2019-standalone/xml-cii-active-restraint-audit.js original 46aada3b9ece68c415ba1ac4aac290e783744cde
- tabs/xml-cii-2019-standalone/xml-cii-restraint-audit-export.js original 314433bac45a0b8135d0992c017672734218f9f3
- tests/xmlcii-source-native-trace.test.mjs (new)
- tests/xml229-native-owner-blocker-evidence.test.mjs original 7b4128f6e29f6eb23bffb5d0685df6d25a072eb5
- docs/tabs/xml-cii-2019-standalone/xml-cii-source-native-trace.js (new)
- docs/tabs/xml-cii-2019-standalone/xml-cii-active-restraint-audit.js original 46aada3b9ece68c415ba1ac4aac290e783744cde
- docs/tabs/xml-cii-2019-standalone/xml-cii-restraint-audit-export.js original 314433bac45a0b8135d0992c017672734218f9f3


PR10 allocated. Actual original-source test also covers PS4130.1.1 (original source PIPE-REST, ISONOTE REST(1kN)) with code14 and zero gap, verifies actual native address rather than assuming a node or block. Exact-head checks pending.
