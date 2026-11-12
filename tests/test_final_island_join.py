"""Governed Final path: coincident-island joins are accepted only when
recorded and within tolerance (synthetic data only)."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "converters" / "scripts"))
import xml_to_cii2019 as base  # noqa: E402
from xml229_native_final_mass_binding import (  # noqa: E402
    NativeMassError, _assert_preserved_node_connectivity, _undo_recorded_island_joins)


def node(number, x, y=0.0, z=0.0):
    return SimpleNamespace(node_number=number, position=(x, y, z))


def doc(*rows):
    return SimpleNamespace(branches=[SimpleNamespace(nodes=list(r)) for r in rows])


SOURCE = [["10", "759", "20"], ["760", "770"]]


class FinalIslandJoinTest(unittest.TestCase):
    def joined(self):
        d = doc([node(10, 0), node(759, 1000), node(20, 2000)],
                [node(759, 1003.2), node(770, 1003.2, 500)])
        labels = [[str(n.node_number) for n in b.nodes] for b in d.branches]
        return d, labels

    def test_unrecorded_join_is_still_refused(self):
        d, labels = self.joined()
        with self.assertRaises(NativeMassError):
            _assert_preserved_node_connectivity(SOURCE, _undo_recorded_island_joins(d, labels, []))

    def test_recorded_join_within_tolerance_is_accepted(self):
        d, labels = self.joined()
        joins = [{"old": 760, "new": 759, "gap": 3.2, "tolerance": 6.0, "positions": [(1, 0)]}]
        undone = _undo_recorded_island_joins(d, labels, joins)
        self.assertEqual(undone, [["10", "759", "20"], ["760", "770"]])
        _assert_preserved_node_connectivity(SOURCE, undone)

    def test_recorded_join_beyond_tolerance_is_refused(self):
        d = doc([node(10, 0), node(759, 1000), node(20, 2000)],
                [node(759, 1009.0), node(770, 1009.0, 500)])
        labels = [[str(n.node_number) for n in b.nodes] for b in d.branches]
        joins = [{"old": 760, "new": 759, "gap": 3.2, "tolerance": 6.0, "positions": [(1, 0)]}]
        with self.assertRaises(NativeMassError):
            _undo_recorded_island_joins(d, labels, joins)

    def test_tolerance_above_6mm_is_refused(self):
        d, labels = self.joined()
        joins = [{"old": 760, "new": 759, "gap": 3.2, "tolerance": 50.0, "positions": [(1, 0)]}]
        with self.assertRaises(NativeMassError):
            _undo_recorded_island_joins(d, labels, joins)

    def test_merge_records_positions_and_runs_on_finalized_path(self):
        def xnode(number, x, y=0.0):
            fields = base.XmlNode.__dataclass_fields__
            return base.XmlNode(
                node_number=number, node_name="", endpoint=None, component_type="PIPE", rigid=None,
                weight=0.0, material_code=None, outside_diameter=100.0, alpha_angle=None,
                wall_thickness=5.0, corrosion_allowance=0.0, insulation_thickness=0.0,
                bend_radius=0.0, bend_type=None, position=(x, y, 0.0), restraint_specs=(),
                **({"component_ref_no": ""} if "component_ref_no" in fields else {}))
        a = base.XmlBranch("A", 20.0, 0.0, 0.0, None, (), (), [xnode(10, 0), xnode(759, 1000), xnode(20, 2000)])
        b = base.XmlBranch("B", 20.0, 0.0, 0.0, None, (), (), [xnode(760, 1003.2), xnode(770, 1003.2, 500)])
        base._merge_coincident_orphan_nodes([a, b])
        self.assertEqual(base.COINCIDENT_ISLAND_JOINS[0]["positions"], [(1, 0)])
        self.assertEqual((base.COINCIDENT_ISLAND_JOINS[0]["old"], base.COINCIDENT_ISLAND_JOINS[0]["new"]), (760, 759))
        src = Path(base.__file__).read_text(encoding="utf-8")
        # The join call sits outside the preserve_finalized_geometry guard.
        guard = src.index("if not preserve_finalized_geometry:")
        call = src.index("branches = _merge_coincident_orphan_nodes(branches)", guard)
        between = src[guard:call]
        self.assertIn("\n    # Owner decision", between)


if __name__ == "__main__":
    unittest.main()
