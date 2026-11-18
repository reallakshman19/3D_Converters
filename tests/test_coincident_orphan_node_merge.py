"""Unconnected islands whose node sits within +-6 mm of another island's node
are joined by renaming the island node (synthetic data only)."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "converters" / "scripts"))
import xml_to_cii2019 as base  # noqa: E402


def node(number, x, y=0.0, z=0.0, kind="PIPE", specs=()):
    return base.XmlNode(
        node_number=number, node_name="", endpoint=None, component_type=kind, rigid=None,
        weight=0.0, material_code=None, outside_diameter=100.0, alpha_angle=None,
        wall_thickness=5.0, corrosion_allowance=0.0, insulation_thickness=0.0, bend_radius=0.0,
        bend_type=None, position=(x, y, z), restraint_specs=tuple(specs),
        **({"component_ref_no": ""} if "component_ref_no" in base.XmlNode.__dataclass_fields__ else {}))


def branch(name, *nodes):
    return base.XmlBranch(name, 20.0, 0.0, 0.0, None, (), (), list(nodes))


def numbers(branches):
    return [[n.node_number for n in b.nodes] for b in branches]


class CoincidentOrphanNodeMergeTest(unittest.TestCase):
    def test_island_start_within_tolerance_is_renamed(self):
        # Branch B starts at 760, 3.2 mm from 759 on branch A (like a dropped gasket).
        a = branch("A", node(10, 0), node(759, 1000), node(20, 2000))
        b = branch("B", node(760, 1003.2), node(770, 1003.2, 500))
        out = base._merge_coincident_orphan_nodes([a, b])
        self.assertEqual(numbers(out), [[10, 759, 20], [759, 770]])
        # Owner 18 Nov 2026: the joined node sits at 759, so B's first element is measured from 759
        # and takes the 3.2 mm (it was left 3.2 mm short before).
        self.assertEqual(out[1].nodes[0].position, (1000.0, 0.0, 0.0))
        self.assertEqual(out[1].nodes[1].position, (1003.2, 500, 0.0))  # nodes after the joint stay put
        self.assertEqual(len(base.MERGED_COINCIDENT_ORPHAN_NODES), 1)
        self.assertIn("760 renamed to 759", base.MERGED_COINCIDENT_ORPHAN_NODES[0])

    def test_v045_copy_step10_loads_joins_the_same_way(self):
        # Step 10 in the app loads v045/converters/scripts; it must get the same fix.
        import importlib.util
        path = Path(__file__).resolve().parents[1] / "v045" / "converters" / "scripts" / "xml_to_cii2019.py"
        spec = importlib.util.spec_from_file_location("xml_to_cii2019_v045", path)
        v045 = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = v045
        spec.loader.exec_module(v045)
        mk = lambda n, x, z=0.0: v045.XmlNode(node_number=n, node_name="", endpoint=None, component_type="PIPE", rigid=None,
            weight=0.0, material_code=None, outside_diameter=100.0, alpha_angle=None, wall_thickness=5.0,
            corrosion_allowance=0.0, insulation_thickness=0.0, bend_radius=0.0, bend_type=None, position=(x, 0.0, z),
            restraint_specs=(), **({"component_ref_no": ""} if "component_ref_no" in v045.XmlNode.__dataclass_fields__ else {}))
        a = v045.XmlBranch("A", 20.0, 0.0, 0.0, None, (), (), [mk(10, 0), mk(759, 1000), mk(20, 2000)])
        b = v045.XmlBranch("B", 20.0, 0.0, 0.0, None, (), (), [mk(760, 1003.0), mk(770, 1003.0, 500)])
        out = v045._merge_coincident_orphan_nodes([a, b])
        self.assertEqual([n.node_number for n in out[1].nodes], [759, 770])
        self.assertEqual(out[1].nodes[0].position, (1000.0, 0.0, 0.0))

    def test_any_island_node_not_only_its_start(self):
        a = branch("A", node(10, 0), node(20, 1000))
        b = branch("B", node(30, 1000, 900), node(40, 1000, 4))  # B ends 4 mm from 20
        self.assertEqual(numbers(base._merge_coincident_orphan_nodes([a, b])), [[10, 20], [30, 20]])

    def test_outside_tolerance_left_alone(self):
        a = branch("A", node(10, 0), node(20, 1000))
        b = branch("B", node(30, 1006.5), node(40, 2000))
        self.assertEqual(numbers(base._merge_coincident_orphan_nodes([a, b])), [[10, 20], [30, 40]])
        self.assertEqual(base.MERGED_COINCIDENT_ORPHAN_NODES, [])

    def test_ambiguous_two_targets_left_alone(self):
        a = branch("A", node(10, 0), node(20, 1000), node(21, 1004))
        b = branch("B", node(30, 1002), node(40, 1002, 500))
        self.assertEqual(numbers(base._merge_coincident_orphan_nodes([a, b])),
                         [[10, 20, 21], [30, 40]])

    def test_connected_model_unchanged(self):
        a = branch("A", node(10, 0), node(20, 1000))
        b = branch("B", node(20, 1000), node(30, 1000, 500))
        branches = [a, b]
        out = base._merge_coincident_orphan_nodes(branches)
        self.assertEqual(numbers(out), [[10, 20], [20, 30]])
        self.assertIs(out, branches)

    def test_two_islands_both_joined(self):
        a = branch("A", node(10, 0), node(759, 1000), node(3379, 3000))
        b = branch("B", node(760, 1003.2), node(770, 1003.2, 500))
        c = branch("C", node(3380, 3000, 0, 3.2), node(3390, 3000, 0, 800))
        self.assertEqual(numbers(base._merge_coincident_orphan_nodes([a, b, c])),
                         [[10, 759, 3379], [759, 770], [3379, 3390]])
        self.assertEqual(len(base.MERGED_COINCIDENT_ORPHAN_NODES), 2)

    def test_different_supports_on_both_nodes_are_merged_not_conflicting(self):
        rest = base.RestraintSpec(1, 1.0e12, 0.0, 0.3, False)
        guide = base.RestraintSpec(2, 1.0e12, 0.0, 0.3, False)
        a = branch("A", node(10, 0), node(759, 1000, specs=[rest]), node(20, 2000))
        b = branch("B", node(760, 1003.2, specs=[guide]), node(770, 1003.2, 500))
        out = base._merge_coincident_orphan_nodes([a, b])
        self.assertEqual(numbers(out), [[10, 759, 20], [759, 770]])
        specs = base._build_explicit_restraint_specs(out)  # must not raise
        self.assertEqual(set(specs[759]), {rest, guide})

    def test_largest_island_keeps_its_numbers(self):
        small = branch("S", node(760, 1003.2), node(770, 1003.2, 500))
        big = branch("A", node(10, 0), node(759, 1000), node(20, 2000))
        self.assertEqual(numbers(base._merge_coincident_orphan_nodes([small, big])),
                         [[759, 770], [10, 759, 20]])

    def test_many_nodes_is_fast(self):
        import time
        main = branch("M", *[node(10 + i, i * 100.0) for i in range(3000)])
        islands = [branch(f"I{k}", node(100000 + 2 * k, k * 300.0 + 2.0, 0, 0),
                          node(100001 + 2 * k, k * 300.0 + 2.0, 900, 0)) for k in range(20)]
        start = time.perf_counter()
        out = base._merge_coincident_orphan_nodes([main, *islands])
        self.assertLess(time.perf_counter() - start, 5.0)
        self.assertEqual(len(base.MERGED_COINCIDENT_ORPHAN_NODES), 20)


if __name__ == "__main__":
    unittest.main()
