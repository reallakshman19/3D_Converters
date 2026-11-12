"""Mode B: the coincident-island join never connects two combined sources.

RCA-03 (Owner, 12 Nov): a Mode B XML holds independent sources whose nodes
can sit on each other (a source combined with its own copy is the extreme
case). The island join must work inside each source exactly as it does on
that source alone, and never across sources. Runs on both converter copies
(root steps 1-5 and v045 steps 6-10). Synthetic data only.
"""
from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIRS = {"root": ROOT / "converters" / "scripts", "v045": ROOT / "v045" / "converters" / "scripts"}


def load(tag):
    spec = importlib.util.spec_from_file_location(f"xml_to_cii2019_{tag}_modeb", DIRS[tag] / "xml_to_cii2019.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


MODULES = {tag: load(tag) for tag in DIRS}


def node(base, number, x, y=0.0, z=0.0):
    values = dict(node_number=number, node_name="", endpoint=None, component_type="PIPE", rigid=None,
                  weight=0.0, material_code=None, outside_diameter=100.0, alpha_angle=None,
                  wall_thickness=5.0, corrosion_allowance=0.0, insulation_thickness=0.0, bend_radius=0.0,
                  bend_type=None, position=(x, y, z), restraint_specs=(), component_ref_no="")
    fields = base.XmlNode.__dataclass_fields__
    return base.XmlNode(**{key: value for key, value in values.items() if key in fields})


def branch(base, name, source, *nodes):
    return base.XmlBranch(name, 20.0, 0.0, 0.0, None, (), (), list(nodes), mode_b_source=source)


def numbers(branches):
    return [[n.node_number for n in b.nodes] for b in branches]


def two_sources(base, step=100000):
    base.configure_mode_b_sources({"sources": [
        {"sourceId": "1:A", "minNode": 10, "maxNode": 900},
        {"sourceId": "2:B", "minNode": step + 10, "maxNode": step + 900}]})


class ModeBIslandIsolationTest(unittest.TestCase):
    def tearDown(self):
        for base in MODULES.values():
            base.configure_mode_b_sources(None)

    def test_without_mode_b_coincident_islands_still_join(self):
        for tag, base in MODULES.items():
            with self.subTest(copy=tag):
                a = branch(base, "A", "", node(base, 10, 0), node(base, 50, 1000), node(base, 20, 2000))
                b = branch(base, "B", "", node(base, 60, 1003.2), node(base, 70, 1003.2, 500))
                out = base._merge_coincident_orphan_nodes([a, b])
                self.assertEqual(numbers(out), [[10, 50, 20], [50, 70]])
                self.assertEqual(base.COINCIDENT_ISLAND_JOINS_BLOCKED, [])

    def test_duplicate_source_is_never_joined_to_its_copy(self):
        # Source B is source A copied with +100000: every node is coincident.
        for tag, base in MODULES.items():
            with self.subTest(copy=tag):
                two_sources(base)
                a = branch(base, "A", "1:A", node(base, 10, 0), node(base, 50, 1000), node(base, 20, 2000))
                b = branch(base, "B", "2:B", node(base, 100010, 0), node(base, 100050, 1000), node(base, 100020, 2000))
                out = base._merge_coincident_orphan_nodes([a, b])
                self.assertEqual(numbers(out), [[10, 50, 20], [100010, 100050, 100020]])
                self.assertEqual(base.MERGED_COINCIDENT_ORPHAN_NODES, [])
                self.assertTrue(base.COINCIDENT_ISLAND_JOINS_BLOCKED)
                self.assertTrue(all(entry.startswith("COINCIDENT_ISLAND_JOIN_BLOCKED_CROSS_SOURCE")
                                    for entry in base.COINCIDENT_ISLAND_JOINS_BLOCKED))
                self.assertIn("source 1:A", base.COINCIDENT_ISLAND_JOINS_BLOCKED[0])

    def test_join_inside_one_source_matches_that_source_alone(self):
        for tag, base in MODULES.items():
            with self.subTest(copy=tag):
                def source_b(offset, source):
                    main = branch(base, "B1", source, node(base, offset + 10, 0, 0, 5000),
                                  node(base, offset + 30, 1000, 0, 5000), node(base, offset + 40, 2000, 0, 5000))
                    island = branch(base, "B2", source, node(base, offset + 31, 1002.0, 0, 5000),
                                    node(base, offset + 32, 1002.0, 800, 5000))
                    return [main, island]
                alone = base._merge_coincident_orphan_nodes(source_b(0, ""))
                two_sources(base)
                # Source A is bigger (so it is the global largest island) and has a
                # node sitting on B's island node: that cross hit must not make
                # B's own join ambiguous or redirect it.
                a = branch(base, "A", "1:A", node(base, 10, 0), node(base, 20, 500), node(base, 50, 1002.0, 0, 5000),
                           node(base, 60, 1500), node(base, 70, 2500))
                out = base._merge_coincident_orphan_nodes([a, *source_b(100000, "2:B")])
                self.assertEqual(numbers(alone), [[10, 30, 40], [30, 32]])
                self.assertEqual(numbers(out)[1:], [[100010, 100030, 100040], [100030, 100032]])
                self.assertEqual(numbers(out)[0], [10, 20, 50, 60, 70])
                self.assertEqual(len(base.MERGED_COINCIDENT_ORPHAN_NODES), 1)
                self.assertIn("100031 renamed to 100030", base.MERGED_COINCIDENT_ORPHAN_NODES[0])

    def test_unresolved_source_never_joins(self):
        for tag, base in MODULES.items():
            with self.subTest(copy=tag):
                two_sources(base)
                a = branch(base, "A", "1:A", node(base, 10, 0), node(base, 50, 1000), node(base, 20, 2000))
                stray = branch(base, "X", base.MODE_B_UNRESOLVED_SOURCE, node(base, 5, 1003.2), node(base, 6, 1003.2, 500))
                out = base._merge_coincident_orphan_nodes([a, stray])
                self.assertEqual(numbers(out), [[10, 50, 20], [5, 6]])
                self.assertIn("source unresolved", " ".join(base.COINCIDENT_ISLAND_JOINS_BLOCKED))

    def test_branch_source_read_from_xml_numbers(self):
        for tag, base in MODULES.items():
            with self.subTest(copy=tag):
                two_sources(base)
                xml = ("<Pipe><Branch><Node><NodeNumber>100010</NodeNumber></Node>"
                       "<Node><NodeNumber>-1</NodeNumber></Node><Node><NodeNumber>100020</NodeNumber></Node></Branch>"
                       "<Branch><Node><NodeNumber>10</NodeNumber></Node><Node><NodeNumber>100020</NodeNumber></Node></Branch>"
                       "<Branch><Node><NodeNumber>5</NodeNumber></Node></Branch></Pipe>")
                b1, b2, b3 = ET.fromstring(xml).findall("Branch")
                self.assertEqual(base._mode_b_branch_source(b1, "", {}), "2:B")
                self.assertEqual(base._mode_b_branch_source(b2, "", {}), base.MODE_B_UNRESOLVED_SOURCE)
                self.assertEqual(base._mode_b_branch_source(b3, "", {}), base.MODE_B_UNRESOLVED_SOURCE)
                base.configure_mode_b_sources(None)
                self.assertEqual(base._mode_b_branch_source(b1, "", {}), "")

    def test_bad_mode_b_config_is_refused(self):
        bad = [{"sources": []}, {"sources": [{"sourceId": "a", "minNode": 1}]},
               {"sources": [{"sourceId": "a", "minNode": 1, "maxNode": 50}, {"sourceId": "b", "minNode": 50, "maxNode": 90}]},
               {"sources": [{"sourceId": "a", "minNode": 1, "maxNode": 5}, {"sourceId": "a", "minNode": 9, "maxNode": 12}]},
               "yes"]
        for tag, base in MODULES.items():
            for config in bad:
                with self.subTest(copy=tag, config=config):
                    with self.assertRaisesRegex(ValueError, "MODE_B_CONFIG_INVALID"):
                        base.configure_mode_b_sources(config)

    def test_support_config_load_sets_and_resets_sources(self):
        script = ("import json, sys\nsys.path.insert(0, sys.argv[1])\n"
                  "import xml_to_cii2019 as b, xml_to_cii2019_patched as p\n"
                  "p._load_support_config(sys.argv[2]); first = list(b.MODE_B_SOURCES)\n"
                  "p._load_support_config('{}'); print(json.dumps([first, b.MODE_B_SOURCES]))\n")
        config = json.dumps({"modeB": {"sources": [{"sourceId": "1:A", "minNode": 1, "maxNode": 9}]}})
        for tag, folder in DIRS.items():
            with self.subTest(copy=tag):
                run = subprocess.run([sys.executable, "-c", script, str(folder), config],
                                     capture_output=True, text=True, check=True)
                first, after = json.loads(run.stdout.strip().splitlines()[-1])
                self.assertEqual(first, [{"sourceId": "1:A", "minNode": 1, "maxNode": 9}])
                self.assertEqual(after, [])


if __name__ == "__main__":
    unittest.main()
