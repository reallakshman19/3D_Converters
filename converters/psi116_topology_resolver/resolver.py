from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import asdict, dataclass, field
from hashlib import sha256
import argparse
import json
import math
from pathlib import Path
import re
from typing import Callable, Iterable, Sequence
import xml.etree.ElementTree as ET

SCHEMA_FINDINGS = "psi116-topology-findings/v1"
SCHEMA_FIX_PLAN = "psi116-topology-fix-plan/v1"

SPECIAL_TYPES = frozenset({"ELBO", "TEE", "OLET", "REDU", "BRAN"})
INLINE_TYPES = frozenset({"VALV", "FLAN", "GASK", "INST", "RIGID"})
DEFINITELY_NON_RIGID_TYPES = frozenset({"PIPE", "ELBO", "TEE", "OLET", "REDU", "BRAN", "ATTA", "SUPPORT", "ANCI"})
TYPE_ALIASES = {
    "BEND": "ELBO",
    "ELBOW": "ELBO",
    "REDUCER": "REDU",
    "WELDOLET": "OLET",
    "SOCKOLET": "OLET",
    "SUPPORT": "ATTA",
    "ANCI": "ATTA",
}


@dataclass(frozen=True)
class ResolverConfig:
    exact_coincidence_tolerance_mm: float = 0.001
    connection_tolerance_mm: float = 0.5
    short_span_threshold_mm: float = 6.0
    collinear_tolerance_mm: float = 0.5

    def validate(self) -> None:
        for name, value in asdict(self).items():
            if not math.isfinite(float(value)) or float(value) < 0:
                raise ValueError(f"{name} must be a non-negative finite number.")
        if self.exact_coincidence_tolerance_mm > self.connection_tolerance_mm:
            raise ValueError("exact coincidence tolerance cannot exceed connection tolerance.")
        if self.connection_tolerance_mm > self.short_span_threshold_mm:
            raise ValueError("connection tolerance cannot exceed short-span threshold.")


@dataclass(frozen=True)
class Position:
    x: float
    y: float
    z: float

    def distance_to(self, other: "Position") -> float:
        return math.dist((self.x, self.y, self.z), (other.x, other.y, other.z))


@dataclass(frozen=True)
class NodeRecord:
    branch_index: int
    branch_name: str
    source_index: int
    node_number: int | None
    node_name: str
    endpoint: int | None
    component_type: str
    raw_component_type: str
    component_ref_no: str
    connection_type: str
    position: Position | None
    rigid: int | None
    weight: float | None
    outside_diameter: float | None
    wall_thickness: float | None
    bend_radius: float | None
    alpha_angle: float | None
    has_restraint: bool
    raw_xml: str

    @property
    def key(self) -> str:
        number = "none" if self.node_number is None else str(self.node_number)
        return f"B{self.branch_index}:N{number}:S{self.source_index}"

    @property
    def positive(self) -> bool:
        return self.node_number is not None and self.node_number > 0

    @property
    def semantic_type(self) -> str:
        if self.component_type == "BRAN" and self.connection_type == "TEE":
            return "TEE"
        return self.component_type

    @property
    def carries_engineering_semantics(self) -> bool:
        return bool(
            self.node_name
            or self.has_restraint
            or self.rigid not in {None, 0}
            or (self.weight is not None and abs(self.weight) > 1e-12)
            or self.semantic_type != "PIPE"
            or self.component_ref_no
        )


@dataclass(frozen=True)
class BranchRecord:
    index: int
    name: str
    nodes: tuple[NodeRecord, ...]


@dataclass(frozen=True)
class ComponentOccurrence:
    occurrence_id: str
    branch_index: int
    branch_name: str
    component_ref_no: str
    semantic_type: str
    records: tuple[NodeRecord, ...]

    @property
    def positive_node_numbers(self) -> tuple[int, ...]:
        return tuple(record.node_number for record in self.records if record.positive and record.node_number is not None)

    @property
    def endpoint_set(self) -> tuple[int, ...]:
        return tuple(sorted({record.endpoint for record in self.records if record.endpoint is not None}))


@dataclass(frozen=True)
class RouteSpan:
    span_id: str
    branch_index: int
    branch_name: str
    from_node: NodeRecord
    to_node: NodeRecord
    length_mm: float


@dataclass(frozen=True)
class Finding:
    finding_id: str
    code: str
    severity: str
    blocking: bool
    message: str
    branch_name: str = ""
    node_keys: tuple[str, ...] = ()
    node_numbers: tuple[int, ...] = ()
    component_ref_nos: tuple[str, ...] = ()
    span_ids: tuple[str, ...] = ()
    length_mm: float | None = None
    details: dict[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class FixAction:
    action_id: str
    finding_ids: tuple[str, ...]
    disposition: str
    status: str
    confidence: float
    authority: str
    message: str
    branch_name: str = ""
    node_numbers: tuple[int, ...] = ()
    component_ref_nos: tuple[str, ...] = ()
    span_ids: tuple[str, ...] = ()
    owner_node_number: int | None = None
    absorbed_node_numbers: tuple[int, ...] = ()
    proposed_changes: tuple[dict[str, object], ...] = ()
    blockers: tuple[str, ...] = ()


@dataclass(frozen=True)
class Psi116Document:
    source_path: str
    source_text: str
    source_sha256: str
    namespace: str
    branches: tuple[BranchRecord, ...]
    occurrences: tuple[ComponentOccurrence, ...]
    spans: tuple[RouteSpan, ...]


@dataclass(frozen=True)
class ResolutionResult:
    document: Psi116Document
    findings: tuple[Finding, ...]
    fix_actions: tuple[FixAction, ...]

    def findings_payload(self, config: ResolverConfig) -> dict[str, object]:
        counts = Counter(finding.code for finding in self.findings)
        blocking = sum(1 for finding in self.findings if finding.blocking)
        return {
            "schema": SCHEMA_FINDINGS,
            "source": {
                "path": self.document.source_path,
                "sha256": self.document.source_sha256,
                "namespace": self.document.namespace,
            },
            "config": asdict(config),
            "summary": {
                "branchCount": len(self.document.branches),
                "sourceNodeRecordCount": sum(len(branch.nodes) for branch in self.document.branches),
                "componentOccurrenceCount": len(self.document.occurrences),
                "positiveRouteSpanCount": len(self.document.spans),
                "findingCount": len(self.findings),
                "blockingFindingCount": blocking,
                "findingCountsByCode": dict(sorted(counts.items())),
            },
            "findings": [_finding_dict(finding) for finding in self.findings],
        }

    def fix_plan_payload(self, config: ResolverConfig) -> dict[str, object]:
        counts = Counter(action.disposition for action in self.fix_actions)
        blocked = sum(1 for action in self.fix_actions if action.status == "BLOCKED")
        return {
            "schema": SCHEMA_FIX_PLAN,
            "source": {
                "path": self.document.source_path,
                "sha256": self.document.source_sha256,
                "namespace": self.document.namespace,
            },
            "config": asdict(config),
            "mutationPolicy": "DRY_RUN_ONLY",
            "sourceXmlMutated": False,
            "summary": {
                "actionCount": len(self.fix_actions),
                "blockedActionCount": blocked,
                "proposedActionCount": len(self.fix_actions) - blocked,
                "actionCountsByDisposition": dict(sorted(counts.items())),
            },
            "actions": [_action_dict(action) for action in self.fix_actions],
        }


def _finding_dict(finding: Finding) -> dict[str, object]:
    payload = asdict(finding)
    for key in ("node_keys", "node_numbers", "component_ref_nos", "span_ids"):
        payload[key] = list(payload[key])
    return payload


def _action_dict(action: FixAction) -> dict[str, object]:
    payload = asdict(action)
    for key in (
        "finding_ids", "node_numbers", "component_ref_nos", "span_ids",
        "absorbed_node_numbers", "proposed_changes", "blockers",
    ):
        payload[key] = list(payload[key])
    return payload


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _child_text(element: ET.Element, name: str) -> str:
    for child in element:
        if _local_name(child.tag) == name:
            return (child.text or "").strip()
    return ""


def _parse_int(value: str) -> int | None:
    try:
        return int(value.strip())
    except (AttributeError, TypeError, ValueError):
        return None


def _parse_float(value: str) -> float | None:
    try:
        parsed = float(value.strip())
    except (AttributeError, TypeError, ValueError):
        return None
    return parsed if math.isfinite(parsed) else None


def _parse_position(value: str) -> Position | None:
    values = re.findall(r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][-+]?\d+)?", value or "")
    if len(values) < 3:
        return None
    numbers = [float(item) for item in values[:3]]
    if not all(math.isfinite(item) for item in numbers):
        return None
    return Position(*numbers)


def _normalize_type(value: str) -> str:
    upper = (value or "").strip().upper()
    return TYPE_ALIASES.get(upper, upper or "PIPE")


def _namespace(root: ET.Element) -> str:
    if root.tag.startswith("{") and "}" in root.tag:
        return root.tag[1:].split("}", 1)[0]
    return ""


def _iter_named(root: ET.Element, name: str) -> Iterable[ET.Element]:
    for element in root.iter():
        if _local_name(element.tag) == name:
            yield element


def read_psi116_xml(source: str | Path, *, source_name: str | None = None) -> Psi116Document:
    if isinstance(source, Path) or (isinstance(source, str) and "<" not in source):
        path = Path(source)
        source_text = path.read_text(encoding="utf-8")
        resolved_source_name = source_name or str(path)
    else:
        source_text = str(source)
        resolved_source_name = source_name or "<memory>"
    root = ET.fromstring(source_text)
    branches: list[BranchRecord] = []
    for branch_index, branch_element in enumerate(_iter_named(root, "Branch")):
        branch_name = _child_text(branch_element, "Branchname")
        nodes: list[NodeRecord] = []
        node_elements = [child for child in branch_element if _local_name(child.tag) == "Node"]
        for source_index, node_element in enumerate(node_elements):
            raw_type = _child_text(node_element, "ComponentType")
            nodes.append(NodeRecord(
                branch_index=branch_index,
                branch_name=branch_name,
                source_index=source_index,
                node_number=_parse_int(_child_text(node_element, "NodeNumber")),
                node_name=_child_text(node_element, "NodeName"),
                endpoint=_parse_int(_child_text(node_element, "Endpoint")),
                component_type=_normalize_type(raw_type),
                raw_component_type=raw_type.strip().upper(),
                component_ref_no=_child_text(node_element, "ComponentRefNo"),
                connection_type=_child_text(node_element, "ConnectionType").upper(),
                position=_parse_position(_child_text(node_element, "Position")),
                rigid=_parse_int(_child_text(node_element, "Rigid")),
                weight=_parse_float(_child_text(node_element, "Weight")),
                outside_diameter=_parse_float(_child_text(node_element, "OutsideDiameter")),
                wall_thickness=_parse_float(_child_text(node_element, "WallThickness")),
                bend_radius=_parse_float(_child_text(node_element, "BendRadius")),
                alpha_angle=_parse_float(_child_text(node_element, "AlphaAngle")),
                has_restraint=any(_local_name(child.tag) == "Restraint" for child in node_element),
                raw_xml=ET.tostring(node_element, encoding="unicode"),
            ))
        branches.append(BranchRecord(branch_index, branch_name, tuple(nodes)))
    occurrences = _build_occurrences(branches)
    spans = _build_spans(branches)
    return Psi116Document(
        source_path=resolved_source_name,
        source_text=source_text,
        source_sha256=sha256(source_text.encode("utf-8")).hexdigest(),
        namespace=_namespace(root),
        branches=tuple(branches),
        occurrences=tuple(occurrences),
        spans=tuple(spans),
    )


def _build_occurrences(branches: Sequence[BranchRecord]) -> list[ComponentOccurrence]:
    occurrences: list[ComponentOccurrence] = []
    for branch in branches:
        current: list[NodeRecord] = []
        current_key: tuple[str, str] | None = None
        sequence = 0
        for node in branch.nodes:
            key = (node.component_ref_no.strip(), node.semantic_type)
            if not key[0]:
                if current:
                    sequence += 1
                    occurrences.append(_make_occurrence(branch, sequence, current_key, current))
                    current, current_key = [], None
                sequence += 1
                occurrences.append(_make_occurrence(branch, sequence, key, [node]))
                continue
            if current and key != current_key:
                sequence += 1
                occurrences.append(_make_occurrence(branch, sequence, current_key, current))
                current = []
            current_key = key
            current.append(node)
        if current:
            sequence += 1
            occurrences.append(_make_occurrence(branch, sequence, current_key, current))
    return occurrences


def _make_occurrence(branch: BranchRecord, sequence: int, key: tuple[str, str] | None, records: Sequence[NodeRecord]) -> ComponentOccurrence:
    ref, semantic_type = key or ("", records[0].semantic_type)
    return ComponentOccurrence(
        occurrence_id=f"OCC-B{branch.index:04d}-{sequence:05d}",
        branch_index=branch.index,
        branch_name=branch.name,
        component_ref_no=ref,
        semantic_type=semantic_type,
        records=tuple(records),
    )


def _build_spans(branches: Sequence[BranchRecord]) -> list[RouteSpan]:
    spans: list[RouteSpan] = []
    sequence = 0
    for branch in branches:
        positive = [node for node in branch.nodes if node.positive and node.position is not None]
        for from_node, to_node in zip(positive, positive[1:]):
            sequence += 1
            spans.append(RouteSpan(
                span_id=f"SPAN-{sequence:06d}",
                branch_index=branch.index,
                branch_name=branch.name,
                from_node=from_node,
                to_node=to_node,
                length_mm=from_node.position.distance_to(to_node.position),
            ))
    return spans


def _position_bucket(position: Position, tolerance: float) -> tuple[int, int, int]:
    scale = tolerance if tolerance > 0 else 1e-9
    return tuple(int(round(value / scale)) for value in (position.x, position.y, position.z))


def _unique_ints(values: Iterable[int | None]) -> tuple[int, ...]:
    return tuple(sorted({value for value in values if value is not None}))


def _unique_text(values: Iterable[str]) -> tuple[str, ...]:
    return tuple(sorted({value for value in values if value}))


def _finding_factory() -> tuple[list[Finding], Callable[..., Finding]]:
    findings: list[Finding] = []

    def add(code: str, severity: str, blocking: bool, message: str, **kwargs: object) -> Finding:
        finding = Finding(
            finding_id=f"FND-{len(findings) + 1:06d}",
            code=code,
            severity=severity,
            blocking=blocking,
            message=message,
            **kwargs,
        )
        findings.append(finding)
        return finding

    return findings, add


def _special_owner(nodes: Sequence[NodeRecord]) -> NodeRecord | None:
    candidates = [node for node in nodes if node.semantic_type in SPECIAL_TYPES]
    if len(candidates) == 1:
        return candidates[0]
    if len(candidates) > 1:
        ranked = sorted(
            candidates,
            key=lambda node: (
                {"ELBO": 5, "TEE": 4, "OLET": 4, "REDU": 3, "BRAN": 2}.get(node.semantic_type, 0),
                1 if node.endpoint == 0 else 0,
                -(node.node_number or 0),
            ),
            reverse=True,
        )
        top = ranked[0]
        tied = [node for node in ranked if (node.semantic_type, node.endpoint == 0) == (top.semantic_type, top.endpoint == 0)]
        return top if len(tied) == 1 else None
    return None


def _analyze_occurrences(document: Psi116Document, add: Callable[..., Finding]) -> None:
    for occurrence in document.occurrences:
        endpoints = set(occurrence.endpoint_set)
        positive = occurrence.positive_node_numbers
        if occurrence.semantic_type == "ELBO":
            if 0 not in endpoints:
                add(
                    "ELBO_OWNER_ENDPOINT_MISSING", "ERROR", True,
                    "Elbow occurrence has no Endpoint=0 engineering owner.",
                    branch_name=occurrence.branch_name,
                    node_keys=tuple(record.key for record in occurrence.records),
                    node_numbers=positive,
                    component_ref_nos=_unique_text((occurrence.component_ref_no,)),
                    details={"occurrenceId": occurrence.occurrence_id, "endpointSet": sorted(endpoints)},
                )
            missing_helpers = sorted({1, 2} - endpoints)
            if missing_helpers:
                add(
                    "ELBO_HELPER_PORTS_MISSING", "WARNING", False,
                    "Elbow occurrence lacks one or more PSI116 helper/tangent endpoints.",
                    branch_name=occurrence.branch_name,
                    node_keys=tuple(record.key for record in occurrence.records),
                    node_numbers=positive,
                    component_ref_nos=_unique_text((occurrence.component_ref_no,)),
                    details={
                        "occurrenceId": occurrence.occurrence_id,
                        "endpointSet": sorted(endpoints),
                        "missingEndpoints": missing_helpers,
                    },
                )
        if occurrence.semantic_type in {"TEE", "OLET"} and 0 not in endpoints:
            add(
                f"{occurrence.semantic_type}_JUNCTION_OWNER_MISSING", "ERROR", True,
                f"{occurrence.semantic_type} occurrence has no Endpoint=0 junction owner.",
                branch_name=occurrence.branch_name,
                node_keys=tuple(record.key for record in occurrence.records),
                node_numbers=positive,
                component_ref_nos=_unique_text((occurrence.component_ref_no,)),
                details={"occurrenceId": occurrence.occurrence_id, "endpointSet": sorted(endpoints)},
            )


def _analyze_coincident_nodes(document: Psi116Document, config: ResolverConfig, add: Callable[..., Finding]) -> None:
    groups: dict[tuple[int, int, int], list[NodeRecord]] = defaultdict(list)
    for branch in document.branches:
        for node in branch.nodes:
            if node.positive and node.position is not None:
                groups[_position_bucket(node.position, config.connection_tolerance_mm)].append(node)
    for nodes in groups.values():
        numbers = _unique_ints(node.node_number for node in nodes)
        if len(numbers) < 2:
            continue
        max_distance = max(
            left.position.distance_to(right.position)
            for index, left in enumerate(nodes)
            for right in nodes[index + 1:]
            if left.position is not None and right.position is not None
        )
        if max_distance > config.connection_tolerance_mm:
            continue
        owner = _special_owner(nodes)
        refs = _unique_text(node.component_ref_no for node in nodes)
        if owner:
            add(
                "COINCIDENT_NODE_ALIAS_CANDIDATE", "WARNING", False,
                f"Coincident node identities can be canonicalized to special-component owner Node {owner.node_number}.",
                branch_name=owner.branch_name,
                node_keys=tuple(node.key for node in nodes),
                node_numbers=numbers,
                component_ref_nos=refs,
                details={
                    "ownerNodeNumber": owner.node_number,
                    "ownerType": owner.semantic_type,
                    "maximumResidualMm": max_distance,
                    "crossBranch": len({node.branch_index for node in nodes}) > 1,
                },
            )
        else:
            add(
                "COINCIDENT_NODE_IDENTITY_AMBIGUOUS", "ERROR", True,
                "Coincident positive nodes have no unique engineering owner.",
                branch_name=nodes[0].branch_name,
                node_keys=tuple(node.key for node in nodes),
                node_numbers=numbers,
                component_ref_nos=refs,
                details={"maximumResidualMm": max_distance},
            )


def _analyze_spans(document: Psi116Document, config: ResolverConfig, add: Callable[..., Finding]) -> None:
    for span in document.spans:
        if span.length_mm <= config.exact_coincidence_tolerance_mm:
            owner = _special_owner((span.from_node, span.to_node))
            add(
                "ZERO_LENGTH_ROUTE_SPAN", "ERROR" if owner is None else "WARNING", owner is None,
                "Consecutive positive PSI116 nodes form a zero-length route span.",
                branch_name=span.branch_name,
                node_keys=(span.from_node.key, span.to_node.key),
                node_numbers=_unique_ints((span.from_node.node_number, span.to_node.node_number)),
                component_ref_nos=_unique_text((span.from_node.component_ref_no, span.to_node.component_ref_no)),
                span_ids=(span.span_id,),
                length_mm=span.length_mm,
                details={
                    "fromType": span.from_node.semantic_type,
                    "toType": span.to_node.semantic_type,
                    "preferredOwnerNodeNumber": owner.node_number if owner else None,
                },
            )
        elif span.length_mm < config.short_span_threshold_mm:
            add(
                "SHORT_ROUTE_SPAN", "WARNING", False,
                f"Route span is shorter than {config.short_span_threshold_mm:g} mm and requires semantic disposition.",
                branch_name=span.branch_name,
                node_keys=(span.from_node.key, span.to_node.key),
                node_numbers=_unique_ints((span.from_node.node_number, span.to_node.node_number)),
                component_ref_nos=_unique_text((span.from_node.component_ref_no, span.to_node.component_ref_no)),
                span_ids=(span.span_id,),
                length_mm=span.length_mm,
                details={"fromType": span.from_node.semantic_type, "toType": span.to_node.semantic_type},
            )


def _analyze_rigids(document: Psi116Document, add: Callable[..., Finding]) -> None:
    for branch in document.branches:
        for node in branch.nodes:
            if node.rigid != 2:
                continue
            semantic = node.semantic_type
            if semantic in DEFINITELY_NON_RIGID_TYPES:
                add(
                    "NON_RIGID_COMPONENT_CLASSIFIED_RIGID", "ERROR", False,
                    f"{semantic} Node {node.node_number} is marked Rigid=2 without a rigid component class.",
                    branch_name=node.branch_name,
                    node_keys=(node.key,),
                    node_numbers=_unique_ints((node.node_number,)),
                    component_ref_nos=_unique_text((node.component_ref_no,)),
                    details={"componentType": semantic, "rigid": node.rigid, "weight": node.weight},
                )
            elif semantic == "INST":
                add(
                    "INSTRUMENT_RIGID_EVIDENCE_REQUIRED", "WARNING", True,
                    "Instrument is marked rigid but PSI116 type alone is insufficient evidence for rigid-body projection.",
                    branch_name=node.branch_name,
                    node_keys=(node.key,),
                    node_numbers=_unique_ints((node.node_number,)),
                    component_ref_nos=_unique_text((node.component_ref_no,)),
                    details={"componentType": semantic, "rigid": node.rigid, "weight": node.weight},
                )


def _canonical_direction(span: RouteSpan) -> tuple[float, float, float] | None:
    if span.length_mm <= 1e-12 or span.from_node.position is None or span.to_node.position is None:
        return None
    vector = (
        (span.to_node.position.x - span.from_node.position.x) / span.length_mm,
        (span.to_node.position.y - span.from_node.position.y) / span.length_mm,
        (span.to_node.position.z - span.from_node.position.z) / span.length_mm,
    )
    for value in vector:
        if abs(value) > 1e-12:
            if value < 0:
                return tuple(-item for item in vector)
            break
    return vector


def _line_group_key(span: RouteSpan, config: ResolverConfig) -> tuple[int, ...] | None:
    direction = _canonical_direction(span)
    start = span.from_node.position
    if direction is None or start is None:
        return None
    dkey = tuple(int(round(item * 1_000_000)) for item in direction)
    moment = (
        start.y * direction[2] - start.z * direction[1],
        start.z * direction[0] - start.x * direction[2],
        start.x * direction[1] - start.y * direction[0],
    )
    tolerance = max(config.collinear_tolerance_mm, 1e-9)
    mkey = tuple(int(round(item / tolerance)) for item in moment)
    return (*dkey, *mkey)


def _projection_interval(span: RouteSpan, direction: tuple[float, float, float]) -> tuple[float, float]:
    assert span.from_node.position is not None and span.to_node.position is not None

    def dot(point: Position) -> float:
        return point.x * direction[0] + point.y * direction[1] + point.z * direction[2]

    values = sorted((dot(span.from_node.position), dot(span.to_node.position)))
    return values[0], values[1]


def _share_node_number(left: RouteSpan, right: RouteSpan) -> bool:
    left_numbers = {left.from_node.node_number, left.to_node.node_number}
    right_numbers = {right.from_node.node_number, right.to_node.node_number}
    return bool((left_numbers & right_numbers) - {None})


def _analyze_overlaps(document: Psi116Document, config: ResolverConfig, add: Callable[..., Finding]) -> None:
    groups: dict[tuple[int, ...], list[RouteSpan]] = defaultdict(list)
    for span in document.spans:
        key = _line_group_key(span, config)
        if key is not None:
            groups[key].append(span)
    for spans in groups.values():
        if len(spans) < 2:
            continue
        direction = _canonical_direction(spans[0])
        if direction is None:
            continue
        intervals = [(span, *_projection_interval(span, direction)) for span in spans]
        intervals.sort(key=lambda item: (item[1], item[2], item[0].span_id))
        for index, (left, left_start, left_end) in enumerate(intervals):
            for right, right_start, right_end in intervals[index + 1:]:
                if right_start >= left_end - config.exact_coincidence_tolerance_mm:
                    break
                overlap = min(left_end, right_end) - max(left_start, right_start)
                if overlap <= config.exact_coincidence_tolerance_mm:
                    continue
                if _share_node_number(left, right) and overlap <= config.connection_tolerance_mm:
                    continue
                exact_duplicate = (
                    abs(left_start - right_start) <= config.connection_tolerance_mm
                    and abs(left_end - right_end) <= config.connection_tolerance_mm
                )
                add(
                    "DUPLICATE_ROUTE_SPAN" if exact_duplicate else "COLLINEAR_ROUTE_OVERLAP",
                    "ERROR", True,
                    "Two PSI116 route spans occupy the same collinear interval."
                    if exact_duplicate else "Two PSI116 route spans overlap along a common centreline.",
                    branch_name=left.branch_name,
                    node_keys=(left.from_node.key, left.to_node.key, right.from_node.key, right.to_node.key),
                    node_numbers=_unique_ints((
                        left.from_node.node_number, left.to_node.node_number,
                        right.from_node.node_number, right.to_node.node_number,
                    )),
                    component_ref_nos=_unique_text((
                        left.from_node.component_ref_no, left.to_node.component_ref_no,
                        right.from_node.component_ref_no, right.to_node.component_ref_no,
                    )),
                    span_ids=(left.span_id, right.span_id),
                    length_mm=overlap,
                    details={
                        "overlapLengthMm": overlap,
                        "exactDuplicate": exact_duplicate,
                        "crossBranch": left.branch_index != right.branch_index,
                    },
                )


def analyze_document(document: Psi116Document, config: ResolverConfig | None = None) -> ResolutionResult:
    config = config or ResolverConfig()
    config.validate()
    findings, add = _finding_factory()
    _analyze_occurrences(document, add)
    _analyze_coincident_nodes(document, config, add)
    _analyze_spans(document, config, add)
    _analyze_rigids(document, add)
    _analyze_overlaps(document, config, add)
    findings.sort(key=lambda item: (item.branch_name, item.node_numbers, item.code, item.finding_id))
    normalized = tuple(
        Finding(
            finding_id=f"FND-{index + 1:06d}",
            code=finding.code,
            severity=finding.severity,
            blocking=finding.blocking,
            message=finding.message,
            branch_name=finding.branch_name,
            node_keys=finding.node_keys,
            node_numbers=finding.node_numbers,
            component_ref_nos=finding.component_ref_nos,
            span_ids=finding.span_ids,
            length_mm=finding.length_mm,
            details=finding.details,
        )
        for index, finding in enumerate(findings)
    )
    return ResolutionResult(document=document, findings=normalized, fix_actions=_build_fix_actions(document, normalized))


def _node_index(document: Psi116Document) -> dict[int, list[NodeRecord]]:
    index: dict[int, list[NodeRecord]] = defaultdict(list)
    for branch in document.branches:
        for node in branch.nodes:
            if node.node_number is not None:
                index[node.node_number].append(node)
    return index


def _build_fix_actions(document: Psi116Document, findings: Sequence[Finding]) -> tuple[FixAction, ...]:
    nodes_by_number = _node_index(document)
    spans_by_id = {span.span_id: span for span in document.spans}
    actions: list[FixAction] = []
    for finding in findings:
        disposition = "BLOCK_AMBIGUOUS"
        status = "BLOCKED"
        confidence = 0.0
        authority = "UNRESOLVED"
        message = finding.message
        owner_number: int | None = None
        absorbed: tuple[int, ...] = ()
        changes: tuple[dict[str, object], ...] = ()
        blockers: tuple[str, ...] = (finding.code,) if finding.blocking else ()

        if finding.code == "COINCIDENT_NODE_ALIAS_CANDIDATE":
            owner_number = int(finding.details.get("ownerNodeNumber"))
            absorbed = tuple(number for number in finding.node_numbers if number != owner_number)
            disposition, status, confidence = "ALIAS_COINCIDENT_NODE", "PROPOSED", 1.0
            authority = "UNIQUE_SPECIAL_COMPONENT_OWNER"
            message = f"Canonicalize coincident node identities to Node {owner_number}; retain every source node in the ledger."
            changes = tuple({"operation": "ALIAS_NODE", "sourceNode": number, "canonicalNode": owner_number} for number in absorbed)
            blockers = ()
        elif finding.code in {"ZERO_LENGTH_ROUTE_SPAN", "SHORT_ROUTE_SPAN"}:
            span = spans_by_id.get(finding.span_ids[0]) if finding.span_ids else None
            if span:
                nodes = (span.from_node, span.to_node)
                owner = _special_owner(nodes)
                if owner:
                    other = span.to_node if owner is span.from_node else span.from_node
                    disposition, status, confidence = "CONTRACT_PRESERVE_OWNER", "PROPOSED", 1.0
                    authority = "SPECIAL_COMPONENT_OWNS_COINCIDENT_OR_SHORT_SPAN"
                    owner_number = owner.node_number
                    absorbed = _unique_ints((other.node_number,))
                    message = f"Contract span while retaining {owner.semantic_type} owner Node {owner.node_number}."
                    changes = ({
                        "operation": "CONTRACT_SPAN",
                        "ownerNode": owner.node_number,
                        "absorbedNode": other.node_number,
                        "transfer": ["NodeName", "Restraint", "Weight", "ProcessBoundary", "SourceTrace"],
                    },)
                    blockers = ()
                elif all(node.semantic_type == "PIPE" for node in nodes):
                    candidate = min(nodes, key=lambda node: (1 if node.carries_engineering_semantics else 0, node.source_index))
                    if not candidate.carries_engineering_semantics:
                        owner = span.to_node if candidate is span.from_node else span.from_node
                        disposition, status, confidence = "SAFE_DROP_PIPE_GEOMETRY", "PROPOSED", 0.95
                        authority = "PLAIN_PIPE_NODE_WITHOUT_ENGINEERING_SEMANTICS"
                        owner_number = owner.node_number
                        absorbed = _unique_ints((candidate.node_number,))
                        message = f"Remove plain pipe geometry Node {candidate.node_number} after preserving source disposition evidence."
                        changes = ({"operation": "DROP_PLAIN_PIPE_NODE", "sourceNode": candidate.node_number, "retainedNode": owner.node_number},)
                        blockers = ()
                    else:
                        blockers = ("BOTH_PIPE_NODES_CARRY_ENGINEERING_SEMANTICS",)
                elif any(node.semantic_type in INLINE_TYPES for node in nodes):
                    disposition, status, confidence = "KEEP", "PROPOSED", 1.0
                    authority = "FINITE_INLINE_COMPONENT_MAY_BE_SHORT"
                    message = "Retain the short span; inline component length cannot be discarded solely by threshold."
                    blockers = ()
        elif finding.code == "NON_RIGID_COMPONENT_CLASSIFIED_RIGID":
            node = next((
                node
                for number in finding.node_numbers
                for node in nodes_by_number.get(number, [])
                if node.key in finding.node_keys
            ), None)
            disposition, status, confidence = "REMOVE_FALSE_RIGID", "PROPOSED", 0.95
            authority = "COMPONENT_CLASS_PROHIBITS_RIGID_TYPE_ONLY_INFERENCE"
            message = "Set Rigid to 0 only in a future transactional clone; retain source value and decision evidence."
            if node:
                changes = ({"operation": "SET_RIGID", "nodeNumber": node.node_number, "before": node.rigid, "after": 0},)
            blockers = ()
        elif finding.code == "ELBO_HELPER_PORTS_MISSING":
            disposition, status, confidence = "KEEP", "PROPOSED", 1.0
            authority = "ONE_NODE_ELBO_COMPATIBILITY"
            message = "Preserve the elbow and record missing helper ports; do not fabricate tangent nodes in the resolver foundation."
            blockers = ()
        elif finding.code in {"DUPLICATE_ROUTE_SPAN", "COLLINEAR_ROUTE_OVERLAP"}:
            blockers = ("OVERLAP_OWNERSHIP_NOT_PROVEN",)
        elif not finding.blocking:
            disposition, status, confidence = "KEEP", "PROPOSED", 1.0
            authority = "DIAGNOSTIC_ONLY"
            blockers = ()

        actions.append(FixAction(
            action_id=f"ACT-{len(actions) + 1:06d}",
            finding_ids=(finding.finding_id,),
            disposition=disposition,
            status=status,
            confidence=confidence,
            authority=authority,
            message=message,
            branch_name=finding.branch_name,
            node_numbers=finding.node_numbers,
            component_ref_nos=finding.component_ref_nos,
            span_ids=finding.span_ids,
            owner_node_number=owner_number,
            absorbed_node_numbers=absorbed,
            proposed_changes=changes,
            blockers=blockers,
        ))
    return tuple(actions)


def resolve_psi116(source: str | Path, config: ResolverConfig | None = None, *, source_name: str | None = None) -> ResolutionResult:
    return analyze_document(read_psi116_xml(source, source_name=source_name), config)


def write_sidecars(
    result: ResolutionResult,
    output_dir: str | Path,
    config: ResolverConfig | None = None,
    *,
    stem: str | None = None,
) -> tuple[Path, Path]:
    config = config or ResolverConfig()
    config.validate()
    directory = Path(output_dir)
    directory.mkdir(parents=True, exist_ok=True)
    resolved_stem = stem or Path(result.document.source_path).stem or "psi116"
    findings_path = directory / f"{resolved_stem}.topology-findings.json"
    plan_path = directory / f"{resolved_stem}.topology-fix-plan.json"
    findings_path.write_text(json.dumps(result.findings_payload(config), indent=2, sort_keys=True) + "\n", encoding="utf-8")
    plan_path.write_text(json.dumps(result.fix_plan_payload(config), indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return findings_path, plan_path


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Analyze PSI116 topology and emit non-mutating sidecar findings/fix plans.")
    parser.add_argument("input", type=Path)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--stem")
    parser.add_argument("--short-span-mm", type=float, default=ResolverConfig.short_span_threshold_mm)
    parser.add_argument("--connection-mm", type=float, default=ResolverConfig.connection_tolerance_mm)
    parser.add_argument("--coincidence-mm", type=float, default=ResolverConfig.exact_coincidence_tolerance_mm)
    parser.add_argument("--fail-on-blocking", action="store_true", help="Return exit code 2 when blocking findings exist.")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    config = ResolverConfig(
        short_span_threshold_mm=args.short_span_mm,
        connection_tolerance_mm=args.connection_mm,
        exact_coincidence_tolerance_mm=args.coincidence_mm,
    )
    result = resolve_psi116(args.input, config)
    findings_path, plan_path = write_sidecars(result, args.output_dir, config, stem=args.stem)
    summary = result.findings_payload(config)["summary"]
    print(f"PSI116 topology analysis: {summary['findingCount']} findings, {summary['blockingFindingCount']} blocking")
    print(findings_path)
    print(plan_path)
    return 2 if args.fail_on_blocking and int(summary["blockingFindingCount"]) else 0


if __name__ == "__main__":
    raise SystemExit(main())
