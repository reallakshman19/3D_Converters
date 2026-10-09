# LFJ Stage 1 — sealed source snapshot (Fixture Preparer)

This is a SOURCE-INPUT PACKAGE only, not a Runner B reconstruction, implementation plan, handover, release, or Stage 2 packet.

## Original pinned sources

- `3D_Converters@1205639a43e9ce1589360479d2558678aebcfab7` — 9 explicitly allowlisted original modules, 23 transitively required imports, 26 neutral LFJ source/interface files, and 14 authentic benchmark files.
- `Common@13989969f6b7e432c4f7c1ddfe975449dba53593` — 19 selected V3.2 skill/decomposition/handover source contracts.
- Frozen `STAGE1_RUNNER_B_PROMPT.md` — original Git blob `7504bff62d0e6a495299019e88ee47541443acdb`, file-introducing commit `5067aa1b408973102dccb20e684d9de5689af23a`.
- Issue #1152 — exact sanitized issue BODY copied, without comments; not a Git source-commit file.

The archive prefixes original repository-relative paths by `reallaksh19/3D_Converters/` or `reallaksh19/Common/`. Original source blobs were referenced by their pinned SHA-1 Git object identity; Common contract bytes are copied with the same Git content identity. The only newly authored files are this README, isolation setup, verification helper, manifest and checksum receipt.

## Integrity

At the extracted archive root, run `python3 verify_package.py`. It checks the manifest receipt, content SHA-256, bytes and exact allowlisted file set. The manifest's SHA-256 is in `MANIFEST.sha256`; that receipt intentionally does not recursively hash itself.

## Boundaries and deliberate exclusions

No live source head, Agent A implementation, Agent A PR/status/checks/comments, CI logs, Stage 2 packet, successor answer, branch lease, or handover-evaluation keys were sourced or incorporated. `lfj/governance/**`, `lfj/qualification/**`, LFJ test/HTML fixture files, generated topology-ledger material in `Benchmarks/1885_NC/`, and `Benchmarks/1885Sjson/Masters/**` are deliberately excluded. V3.2 includes 19 required contracts, not every V3.2 tool/test. A fresh runner must ask its trusted controller for any further allowlisting rather than browse elsewhere.

Authentic Owner-provided 30MB/90MB samples were not located among the authorized input list; their qualification remains open. XML/JSON positive engineering pairing remains unproven by this package and must be evaluated by the independent Runner B.

**No claim is made that the independently blind Stage 1 has run or that an execution controller has enforced a new runner's isolation.**
