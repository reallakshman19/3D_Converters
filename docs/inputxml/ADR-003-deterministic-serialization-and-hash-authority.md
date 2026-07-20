# ADR-003: Deterministic Serialization and Hash Authority

## Status
Accepted

## Context
InputXML components produce canonical XML, JSON decision ledgers, and JSON validation reports. A lack of exact-byte serialization authority across platform iterations (e.g., Python hash-seed variance, dictionary ordering, attribute ordering) caused identical logical models to produce mismatched hash identities, undermining crash-consistent verification and traceability.

## Decision
We establish a single, versioned serialization policy (`InputXmlDeterministicSerializationPolicy.v1`) and a centralized runtime authority (`serialization.py`). The runtime compiler must verify this policy during the contract-bundle gate.

### Serialization Policies
1. **XML Canonical Representation**: Attributes on canonical nodes are deterministically ordered according to an explicitly defined hierarchy in the policy file (derived from the field catalog). Extension namespace attributes fallback to lexical ordering. Namespace prefixes are strictly normalized (`COADE` default namespace, `ext` extension namespace).
2. **JSON Output**: All ledger and validation payloads emit strictly sorted JSON objects with fixed 2-space indentation, no trailing zero-padding in numbers, no NaN/Infinity (fail-closed), and strict UTF-8 encoding without ASCII escaping.
3. **Ledger Diagnostics**: Diagnostic entries are deterministically sorted by causality (`stageSequence`), severity, code, entity ID, normalized context, and message before payload generation.
4. **Numeric Representation**: A canonical numeric normalizer drops locale dependencies, strips trailing zeroes, rejects non-finite values, and formats negative zero as `"0"`.

## Consequences
- Identical logical input guarantees identically hashed XML and JSON outputs regardless of the platform, Python hash seed, or object insertion history.
- The pipeline rejects silent serialization mutations caused by non-deterministic iterators or unlisted canonical attributes.
- The schema version explicitly marks the algorithm, permitting future deterministic upgrades if required by CII.
