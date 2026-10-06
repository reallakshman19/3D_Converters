#!/usr/bin/env python3
from pathlib import Path
from types import SimpleNamespace
import sys

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "converters" / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import xml_to_cii2019 as base


def node(*, rigid=None, component_type="", component_ref_no=""):
    return SimpleNamespace(
        rigid=rigid,
        component_type=component_type,
        component_ref_no=component_ref_no,
    )


def edge(from_node, to_node):
    return SimpleNamespace(from_node=from_node, to_node=to_node)


def assert_true(value, message):
    if value is not True:
        raise AssertionError(message)


def assert_false(value, message):
    if value is not False:
        raise AssertionError(message)


# Reported P2810042 authority shape:
# EXE/B2 source RIGID =67127432/19 is adjacent to FLAN =67127432/20.
# Generated numbering may change, but a FLAN immediately after a source Rigid=2
# must not become a normal pipe merely because the adjacent component ref differs.
reported = edge(
    node(rigid=2, component_type="RIGID", component_ref_no="=67127432/19"),
    node(rigid=None, component_type="FLAN", component_ref_no="=67127432/20"),
)
assert_true(
    base._edge_is_rigid(reported),
    "Rigid=2 -> FLAN must retain rigid edge ownership even when adjacent refs differ",
)

# Generality control: this is not a 10/490 or P2810042-only exception.
different_refs = edge(
    node(rigid=2, component_type="RIGID", component_ref_no="=A/100"),
    node(rigid=None, component_type="FLAN", component_ref_no="=B/200"),
)
assert_true(
    base._edge_is_rigid(different_refs),
    "Rigid=2 -> FLAN authority must be ref-independent",
)

# Existing same-ref behavior must remain rigid.
same_ref = edge(
    node(rigid=2, component_type="RIGID", component_ref_no="=A/100"),
    node(rigid=None, component_type="FLAN", component_ref_no="=A/100"),
)
assert_true(base._edge_is_rigid(same_ref), "same-ref Rigid=2 -> FLAN must remain rigid")

# Existing arrival ownership is authoritative and must remain unchanged.
arrival = edge(
    node(rigid=None, component_type="PIPE", component_ref_no="=P/1"),
    node(rigid=2, component_type="RIGID", component_ref_no="=R/1"),
)
assert_true(base._edge_is_rigid(arrival), "to-node Rigid=2 must remain rigid")

# Boundedness: Rigid=2 must not make every outgoing edge rigid.
ordinary_pipe = edge(
    node(rigid=2, component_type="RIGID", component_ref_no="=R/1"),
    node(rigid=None, component_type="PIPE", component_ref_no="=P/2"),
)
assert_false(
    base._edge_is_rigid(ordinary_pipe),
    "Rigid=2 -> ordinary PIPE must not be promoted by the FLAN custody rule",
)

print("Issue #820 rigid edge authority regression checks completed.")
