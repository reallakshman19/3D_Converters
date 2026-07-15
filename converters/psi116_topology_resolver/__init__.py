"""Non-mutating PSI116 topology analysis and dry-run fix planning."""

from .resolver import (
    ResolverConfig,
    ResolutionResult,
    analyze_document,
    read_psi116_xml,
    resolve_psi116,
    write_sidecars,
)

__all__ = [
    "ResolverConfig",
    "ResolutionResult",
    "analyze_document",
    "read_psi116_xml",
    "resolve_psi116",
    "write_sidecars",
]
