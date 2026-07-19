#!/usr/bin/env python3
"""Compiler orchestration state machine."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class CompilerStage(Enum):
    INITIALIZED = "INITIALIZED"
    CONTRACT_BUNDLE_VERIFIED = "CONTRACT_BUNDLE_VERIFIED"
    SOURCE_ENVELOPE_CREATED = "SOURCE_ENVELOPE_CREATED"
    MEDIA_INSPECTED = "MEDIA_INSPECTED"
    DIALECT_RESOLVED = "DIALECT_RESOLVED"
    PROFILE_INTAKE_VALIDATED = "PROFILE_INTAKE_VALIDATED"
    PROFILE_RESOLVED = "PROFILE_RESOLVED"
    SOURCE_ACCOUNTED = "SOURCE_ACCOUNTED"
    CANONICAL_CANDIDATE_BUILT = "CANONICAL_CANDIDATE_BUILT"
    XSD_VALIDATED = "XSD_VALIDATED"
    SCHEMATRON_VALIDATED = "SCHEMATRON_VALIDATED"
    LEDGER_VALIDATED = "LEDGER_VALIDATED"
    PRODUCTION_ACCEPTED = "PRODUCTION_ACCEPTED"


@dataclass
class CompilerTransition:
    sequence: int
    from_stage: str
    to_stage: str
    gate: str


@dataclass
class CompilerState:
    current_stage: CompilerStage = CompilerStage.INITIALIZED
    terminal_status: str | None = None
    transitions: list[CompilerTransition] = field(default_factory=list)
    blocked_at: str | None = None
    _sequence: int = 1

    def transition(self, to_stage: CompilerStage, gate: str = "") -> None:
        if self.terminal_status is not None:
            raise RuntimeError(f"Cannot transition to {to_stage.value} after terminal status {self.terminal_status}.")
        
        stages_order = list(CompilerStage)
        curr_idx = stages_order.index(self.current_stage)
        next_idx = stages_order.index(to_stage)
        
        if next_idx <= curr_idx:
            raise RuntimeError(f"Illegal transition: {self.current_stage.value} -> {to_stage.value} skips backward or repeats.")
        
        if next_idx != curr_idx + 1:
            raise RuntimeError(f"Illegal transition skip: {self.current_stage.value} -> {to_stage.value}.")

        t = CompilerTransition(
            sequence=self._sequence,
            from_stage=self.current_stage.value,
            to_stage=to_stage.value,
            gate=gate or f"{to_stage.value}_GATE",
        )
        self.transitions.append(t)
        self.current_stage = to_stage
        self._sequence += 1

    def block(self, gate: str) -> None:
        if self.terminal_status is not None:
            return
        self.terminal_status = "BLOCKED"
        self.blocked_at = gate

    def accept(self) -> None:
        if self.current_stage != CompilerStage.PRODUCTION_ACCEPTED:
            raise RuntimeError("Cannot accept before PRODUCTION_ACCEPTED stage is reached.")
        if self.terminal_status == "BLOCKED":
            raise RuntimeError("Cannot accept a blocked state.")
        self.terminal_status = "PASS"

    @property
    def completed_stages(self) -> list[str]:
        stages = []
        if self.transitions:
            stages.append(self.transitions[0].from_stage)
            for t in self.transitions:
                stages.append(t.to_stage)
        else:
            stages.append(self.current_stage.value)
        return stages

    def as_orchestration_dict(self) -> dict[str, Any]:
        return {
            "schema": "InputXmlCompilerOrchestration.v1",
            "currentStage": self.current_stage.value,
            "terminalStatus": self.terminal_status or "PENDING",
            "transitions": [
                {
                    "sequence": t.sequence,
                    "from": t.from_stage,
                    "to": t.to_stage,
                    "gate": t.gate,
                }
                for t in self.transitions
            ],
        }

__all__ = ["CompilerStage", "CompilerTransition", "CompilerState"]
