# Architecture Decision Record: Crash-Consistent Artifact Publication

## Context
When producing Canonical InputXML artifacts, failures or interruptions during the final I/O sequence can lead to partial bundles, stale output, and mismatched evidence. Consumers (like the Canonical Resolver) need a rigorous way to confirm that a publication sequence completed fully and reliably.

## Crash-Consistency Statement
We implement a fail-closed crash-consistent publication process for compiler outcomes (`PASS` and `BLOCKED`).
- **Atomic Destination Mutation**: Output files are generated in an ephemeral staging directory within the destination filesystem, and only moved over via atomic `os.replace`.
- **Pre-serialization validation**: A `PublicationPlan` is built and all final bytes are generated and their cryptographic hashes checked prior to any existing destination files being mutated.
- **Fail-closed locks**: The process uses `os.O_CREAT | os.O_EXCL` file locking to enforce a strict single-writer lock per input document (stem).

## Consumer Acceptance Rule
A canonical bundle is only valid and safe to consume if it possesses a **validation commit marker**. 
Consumers MUST verify that:
1. `<stem>.canonical-validation.json` exists and its `publication.state` is `"COMMITTED"`.
2. The hashes for the `<stem>.canonicalization-ledger.json` and `<stem>.canonical.input.xml` recorded in the commit marker exactly match the hashes of the files on disk.
3. The validation `status` exactly matches the `status` found in the ledger.
If any of these conditions are not met, the consumer MUST reject the bundle as invalid or uncommitted.

## Operator Recovery
If the compiler crashes or an exception is unhandled during the publication transaction, the transaction rolls back. 
- The original files are restored from their `.bak` counterparts automatically if possible.
- If an interruption occurred such that `.bak` files exist but the transaction did not roll back automatically, an operator can safely restore `.bak` files manually. 
- If `.staging-*` directories are left behind due to a crash, they can be safely removed by an operator. No staging file is part of a committed artifact bundle.
