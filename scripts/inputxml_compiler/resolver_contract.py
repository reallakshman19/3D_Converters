#!/usr/bin/env python3
"""Resolver outcome contract for compiler profiles."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from lxml import etree as ET


class OutcomeKind(Enum):
    CANONICAL_CANDIDATE = "CANONICAL_CANDIDATE"
    BLOCKED_WITH_CANDIDATE = "BLOCKED_WITH_CANDIDATE"
    BLOCKED_NO_CANDIDATE = "BLOCKED_NO_CANDIDATE"


@dataclass
class ResolverOutcome:
    profile_id: str
    adapter_id: str
    outcome_kind: OutcomeKind
    canonical_candidate: ET._Element | None = None
    source_accounting_status: str = "PENDING"
    profile_diagnostics: list[dict[str, Any]] = field(default_factory=list)
    profile_metrics: dict[str, Any] = field(default_factory=dict)

__all__ = ["OutcomeKind", "ResolverOutcome"]
