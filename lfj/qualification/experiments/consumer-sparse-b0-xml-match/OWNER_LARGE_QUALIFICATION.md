# LFJ A3 — Owner 30 MB / distinct 90 MB qualification

This is an **executable harness**, not a recorded Owner acceptance. The tracked
repository contains no authenticated 30 MB and distinct 90 MB source fixtures.
Synthetic capacity tests, original 0.7/10 MB fixtures, and author CI cannot
stand in for the missing Owner data.

## Collect genuine external inputs

Obtain (a) the Owner's exact original ~30 MB JSON plus corresponding XML,
(b) a **different** ~90 MB JSON plus corresponding XML, and (c) independent
expected Node-wise and Evidence Tree CSV digests and XML node/match counts for
the 30 MB case. Record the origin, acquisition custody, original byte size,
and SHA-256. Keep raw inputs and protected golden outputs out of the public
repository unless expressly authorized.

Copy `owner-large-manifest.example.json` to a private JSON manifest and
fill **all** blanks from independently verified custody records. The example
is intentionally `NOT_STAGED` and cannot be executed successfully.

## Run on the exact candidate checkout

Requires Node 22+ and Playwright (e.g. `npm install --no-save playwright@1.52.0`
then `npx playwright install chromium`).

```bash
git rev-parse HEAD
node lfj/qualification/experiments/consumer-sparse-b0-xml-match/a3-owner-large-qualify.mjs \
  --manifest /safe/owner-large.json \
  --expected-head <40-character-exact-checkout-sha> \
  --out /safe/lfj-owner-large-receipt.json
```

The runner starts its own localhost source server, SHA-256 hashes input files
with streams (rather than loading original 90 MB source into Node memory),
uploads the genuine files through Chromium's native File selector and runs the
real Resolver UI. It checks the source/config revision, Worker Build, two
byte-exact CSV files and finished temporary IndexedDB cleanup for 30 MB.
At 90 MB the existing 32 MiB cap **must** reject before any Worker or IndexedDB
processing; passing this is **not** support for actual 90 MB matching.

The receipt records actual SHA equality and observed outcomes, along with
`provenanceVerifiedIndependently:false` and
`sourceQualifiesForEngineering:false`. An independent Owner acceptance
decision and separate larger-source design are required.

Do **not** relax the current preview size limit to pass the 90 MB case.
`ALL_DECLARED_TESTS_PASSED_OWNER_PROVENANCE_STILL_EXTERNAL` means only that
the declared test cases passed; it does not certify Owner authorship, material
engineering values, or deployed production acceptance.
