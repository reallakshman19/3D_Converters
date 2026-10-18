# BC4.xlsx source-bound Line List fixture

The Owner-supplied workbook was inspected privately and its original file bytes have been pinned by [BC4.fixture.json](./BC4.fixture.json).

- Original uploaded file: `BC4.xlsx`, 241,036 bytes, SHA-256 `3e3b8494f9e70bffd92f5c13492c8c0421739c29a086d41f41306f0d386f240a`
- Worksheet: `LineList`, with 385 nonempty rows after its first-row header (3 inner header-band rows and 382 line entries)
- Original historic normalized Line List SHA-256 **NOT proven**; source row count alone is insufficient
- Original historic mapping SHA-256 **NOT proven**; automatic field map is not necessarily the applied Owner map
- No historical reviews, Match-1/Final approvals or native CII authority are modified by this fixture

## Install actual binary

The GitHub code connector does not accept raw XLSX attachment bytes in a file-edit action. The matching original workbook must be copied byte-for-byte to this directory, or installed from a local file using:

```bash
node scripts/xml229-install-bc4-fixture.mjs /path/to/BC4.xlsx
npm ci --ignore-scripts
node --test tests/xml229-bc4-linelist-fixture.test.mjs
git add tests/fixtures/xml229/BC4.xlsx
```

The installer checks the original SHA-256 and Git blob identity before copying and rechecks after copying. A separate Owner-downloadable drop-in archive contains this `.xlsx` file at its exact intended repository path. Do not mark fixture acceptance complete until the original binary is present and the sheet-parser test is no longer skipped.

**Independent engineering / governed native CII remains HELD.**

## Fail-closed hosted regression and Git binary patch

The exact-source binary patch delivered alongside this fixture must be applied at the repository root **from the PR #299 branch**:

```bash
git apply --check /path/to/xml229_BC4_exact_binary_git.patch
git apply /path/to/xml229_BC4_exact_binary_git.patch
sha256sum tests/fixtures/xml229/BC4.xlsx
node --test tests/xml229-bc4-linelist-fixture.test.mjs
git add tests/fixtures/xml229/BC4.xlsx
git commit -m "test(xml229): install original BC4 Excel fixture exact bytes"
git push origin test/xml229-bc4-linelist-fixture-20261018
```

Expected original workbook SHA-256 is `3e3b8494f9e70bffd92f5c13492c8c0421739c29a086d41f41306f0d386f240a` (Git blob `eea68736e57bb3a25de7a4cdd094916c61b6e665`). The CI job `XML229 BC4 Original Workbook Fixture` **fails RED, rather than skipping**, if the actual XLSX is absent; pass only with the exact file committed. Uploaded file content will be visible to anyone who can view the repository. Historical kg acceptance and governed native CII stay HELD.
