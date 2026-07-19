from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from .base import CompileBlocked, SUPPORTED_COMPILER_DIALECTS, _sha256


DIALECT_REGISTRY_SCHEMA = "InputXmlDialectRegistry.v1"
ADAPTER_REGISTRY_SCHEMA = "InputXmlCanonicalCompilerAdapterRegistry.v1"
CONTRACT_BUNDLE_SCHEMA = "InputXmlRuntimeContractBundle.v1"


class ContractBundleError(CompileBlocked):
    """Raised when the runtime dialect and adapter registries are not closed."""


@dataclass(frozen=True)
class VerifiedContractBundle:
    registry: dict[str, Any]
    adapter_registry: dict[str, Any]
    dialects: dict[str, dict[str, Any]]
    adapters: dict[str, dict[str, Any]]
    metadata: dict[str, Any]


def _load_json_strict(path: Path) -> tuple[dict[str, Any], bytes]:
    try:
        raw = path.read_bytes()
    except OSError as exc:
        raise ContractBundleError(f"Contract registry could not be read: {path}: {exc}") from exc

    duplicates: list[str] = []

    def object_pairs_hook(pairs: Iterable[tuple[str, Any]]) -> dict[str, Any]:
        value: dict[str, Any] = {}
        for key, item in pairs:
            if key in value:
                duplicates.append(key)
            value[key] = item
        return value

    try:
        payload = json.loads(raw.decode("utf-8"), object_pairs_hook=object_pairs_hook)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ContractBundleError(f"Contract registry is not strict UTF-8 JSON: {path}: {exc}") from exc

    if duplicates:
        names = ", ".join(sorted(set(duplicates)))
        raise ContractBundleError(f"Contract registry contains duplicate JSON keys: {path}: {names}")
    if not isinstance(payload, dict):
        raise ContractBundleError(f"Contract registry root must be an object: {path}")
    return payload, raw


def _index_unique_rows(
    rows: Any,
    *,
    collection_name: str,
    identity_field: str,
) -> dict[str, dict[str, Any]]:
    if not isinstance(rows, list):
        raise ContractBundleError(f"{collection_name} must be an array.")

    indexed: dict[str, dict[str, Any]] = {}
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ContractBundleError(f"{collection_name}[{index}] must be an object.")
        identity = row.get(identity_field)
        if not isinstance(identity, str) or not identity.strip():
            raise ContractBundleError(
                f"{collection_name}[{index}] requires non-empty {identity_field}."
            )
        if identity in indexed:
            raise ContractBundleError(
                f"{collection_name} contains duplicate {identity_field} {identity!r}."
            )
        indexed[identity] = row
    return indexed


def _verify_profile_contract(
    dialect_id: str,
    dialect: dict[str, Any],
    adapter: dict[str, Any],
) -> None:
    acceptance = dialect.get("canonicalAcceptance")
    registry_adapter = dialect.get("adapter")
    adapter_id = adapter.get("adapterId")
    status = adapter.get("status")
    result_policy = adapter.get("resultPolicy")

    allowed_statuses = {
        "DIRECT": {"IMPLEMENTED"},
        "ADAPTER_REQUIRED": {"IMPLEMENTED"},
        "RECONCILIATION_REQUIRED": {"IMPLEMENTED"},
        "DIAGNOSTIC_ONLY": {"IMPLEMENTED_BLOCKING"},
        "EXCLUDED": {"EXCLUDED"},
    }
    if acceptance not in allowed_statuses:
        raise ContractBundleError(
            f"Dialect {dialect_id!r} has unsupported canonicalAcceptance {acceptance!r}."
        )
    if status not in allowed_statuses[acceptance]:
        raise ContractBundleError(
            f"Dialect {dialect_id!r} acceptance {acceptance!r} is incompatible with "
            f"adapter status {status!r}."
        )
    if not isinstance(result_policy, str) or not result_policy:
        raise ContractBundleError(f"Dialect {dialect_id!r} requires a resultPolicy.")
    if result_policy in {"DROP", "SKIP"}:
        raise ContractBundleError(
            f"Dialect {dialect_id!r} uses forbidden resultPolicy {result_policy!r}."
        )

    if acceptance == "DIRECT":
        if registry_adapter != "none" or adapter_id != "direct-canonical-validation":
            raise ContractBundleError(
                f"Direct dialect {dialect_id!r} must use registry adapter 'none' and "
                "runtime adapter 'direct-canonical-validation'."
            )
    elif acceptance == "EXCLUDED":
        if registry_adapter != "none" or adapter_id != "none":
            raise ContractBundleError(
                f"Excluded dialect {dialect_id!r} must not declare an executable adapter."
            )
    elif registry_adapter != adapter_id:
        raise ContractBundleError(
            f"Dialect {dialect_id!r} adapter mismatch: registry={registry_adapter!r}, "
            f"runtime={adapter_id!r}."
        )


def verify_contract_bundle(
    registry_path: Path,
    adapter_registry_path: Path | None = None,
    *,
    runtime_supported_dialects: set[str] | None = None,
) -> VerifiedContractBundle:
    adapter_registry_path = adapter_registry_path or (
        registry_path.parent / "compiler" / "inputxml-compiler-adapters.json"
    )
    registry, registry_raw = _load_json_strict(registry_path)
    adapter_registry, adapter_raw = _load_json_strict(adapter_registry_path)

    if registry.get("schema") != DIALECT_REGISTRY_SCHEMA:
        raise ContractBundleError(
            f"Dialect registry schema must be {DIALECT_REGISTRY_SCHEMA!r}."
        )
    if adapter_registry.get("schema") != ADAPTER_REGISTRY_SCHEMA:
        raise ContractBundleError(
            f"Adapter registry schema must be {ADAPTER_REGISTRY_SCHEMA!r}."
        )

    dialects = _index_unique_rows(
        registry.get("dialects"),
        collection_name="dialects",
        identity_field="dialectId",
    )
    adapters = _index_unique_rows(
        adapter_registry.get("adapters"),
        collection_name="adapters",
        identity_field="dialectId",
    )

    if set(dialects) != set(adapters):
        missing_adapters = sorted(set(dialects) - set(adapters))
        unknown_adapters = sorted(set(adapters) - set(dialects))
        raise ContractBundleError(
            "Dialect/adapter registry closure failed: "
            f"missingAdapters={missing_adapters}, unknownAdapters={unknown_adapters}."
        )

    for dialect_id in sorted(dialects):
        _verify_profile_contract(dialect_id, dialects[dialect_id], adapters[dialect_id])

    runtime_supported = set(
        SUPPORTED_COMPILER_DIALECTS
        if runtime_supported_dialects is None
        else runtime_supported_dialects
    )
    registry_implemented = {
        dialect_id
        for dialect_id, adapter in adapters.items()
        if adapter.get("status") in {"IMPLEMENTED", "IMPLEMENTED_BLOCKING"}
    }
    if runtime_supported != registry_implemented:
        missing_runtime = sorted(registry_implemented - runtime_supported)
        unregistered_runtime = sorted(runtime_supported - registry_implemented)
        raise ContractBundleError(
            "Runtime resolver closure failed: "
            f"missingRuntime={missing_runtime}, unregisteredRuntime={unregistered_runtime}."
        )

    registry_hash = _sha256(registry_raw)
    adapter_hash = _sha256(adapter_raw)
    digest_payload = json.dumps(
        {
            "adapterRegistry": {
                "schema": ADAPTER_REGISTRY_SCHEMA,
                "sha256": adapter_hash,
            },
            "dialectRegistry": {
                "schema": DIALECT_REGISTRY_SCHEMA,
                "sha256": registry_hash,
            },
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    metadata = {
        "schema": CONTRACT_BUNDLE_SCHEMA,
        "status": "VERIFIED",
        "digestSha256": _sha256(digest_payload),
        "dialectCount": len(dialects),
        "implementedDialectCount": len(registry_implemented),
        "dialectRegistry": {
            "schema": DIALECT_REGISTRY_SCHEMA,
            "sha256": registry_hash,
        },
        "adapterRegistry": {
            "schema": ADAPTER_REGISTRY_SCHEMA,
            "sha256": adapter_hash,
        },
    }
    return VerifiedContractBundle(
        registry=registry,
        adapter_registry=adapter_registry,
        dialects=dialects,
        adapters=adapters,
        metadata=metadata,
    )


__all__ = [name for name in globals() if not name.startswith("__")]
