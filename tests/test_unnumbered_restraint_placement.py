"""Owner 18 Nov 2026, "Fix the -2 supports": step 10's writer (v045/converters/scripts, the copy step 10 loads) used to
drop the supports of nodes numbered 0 or less (EF-05: 11 ATTA points numbered -2, each given a +Y by step 10's ATTA
default). Now they go to a numbered node: the one at the same point, else the bend's own node at a bend's far end."""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "v045" / "converters" / "scripts"))
import xml_to_cii2019 as base  # noqa: E402

PLUS_Y = "<Restraint><Type>+Y</Type><Stiffness>1.751270E+12</Stiffness><Gap>0</Gap><Friction>0.3</Friction></Restraint>"


def node(number, kind, pos, extra="", endpoint=None):
    ep = f"<Endpoint>{endpoint}</Endpoint>" if endpoint is not None else ""
    return (f"<Node><NodeNumber>{number}</NodeNumber><ComponentType>{kind}</ComponentType>{ep}<Position>{pos}</Position>"
            f"<OutsideDiameter>114.3</OutsideDiameter><WallThickness>6.02</WallThickness>{extra}</Node>")


def parse(*nodes):
    xml = f"<PipeStressExport><Pipe><Branch><Branchname>/T/B1</Branchname>{''.join(nodes)}</Branch></Pipe></PipeStressExport>"
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "t.xml"
        path.write_text(xml, encoding="utf-8")
        doc = base._parse_xml_document(path)
    return {n.node_number: n.restraint_specs for b in doc.branches for n in b.nodes}


class UnnumberedRestraintPlacement(unittest.TestCase):
    def test_same_point_numbered_node_gets_the_support(self):
        specs = parse(node(10, "PIPE", "0 0 0"), node(20, "RIGID", "1000 0 0"), node(-2, "ATTA", "1000 0 0", PLUS_Y),
                      node(30, "PIPE", "2000 0 0"))
        self.assertEqual(len(specs[20]), 1)
        self.assertEqual(specs[10], ())
        self.assertEqual(specs[30], ())
        self.assertEqual(len(base.UNNUMBERED_RESTRAINTS_PLACED), 1)
        self.assertIn("NodeNumber 20 (same point)", base.UNNUMBERED_RESTRAINTS_PLACED[0])

    def test_bend_far_end_goes_to_the_bend_node(self):
        specs = parse(node(10, "PIPE", "0 0 0"), node(-1, "ELBO", "800 0 0", endpoint=1),
                      node(20, "ELBO", "1000 0 0", endpoint=0), node(-1, "ELBO", "1000 200 0", endpoint=2),
                      node(-2, "ATTA", "1000 200 0", PLUS_Y), node(30, "PIPE", "1000 2000 0"))
        self.assertEqual(len(specs[20]), 1)
        self.assertEqual(specs[30], ())
        self.assertIn("NodeNumber 20 (bend end)", base.UNNUMBERED_RESTRAINTS_PLACED[0])

    def test_a_support_of_its_own_is_kept_and_the_moved_one_added(self):
        guide = PLUS_Y.replace("+Y", "GUI")
        specs = parse(node(10, "PIPE", "0 0 0"), node(20, "RIGID", "1000 0 0", guide), node(-2, "ATTA", "1000 0 0", PLUS_Y),
                      node(30, "PIPE", "2000 0 0"))
        self.assertEqual(len(specs[20]), 2)

    def test_no_numbered_node_there_is_listed_not_moved(self):
        specs = parse(node(10, "PIPE", "0 0 0"), node(-2, "ATTA", "500 0 0", PLUS_Y), node(30, "PIPE", "2000 0 0"))
        self.assertEqual(specs, {10: (), 30: ()})
        self.assertEqual(base.UNNUMBERED_RESTRAINTS_PLACED, [])
        self.assertEqual(len(base.UNNUMBERED_RESTRAINTS_NOT_WRITTEN), 1)

    def test_control_unnumbered_node_without_support_changes_nothing(self):
        specs = parse(node(10, "PIPE", "0 0 0"), node(20, "RIGID", "1000 0 0"), node(-2, "ATTA", "1000 0 0"),
                      node(30, "PIPE", "2000 0 0"))
        self.assertEqual(specs, {10: (), 20: (), 30: ()})
        self.assertEqual(base.UNNUMBERED_RESTRAINTS_PLACED, [])


if __name__ == "__main__":
    unittest.main()
