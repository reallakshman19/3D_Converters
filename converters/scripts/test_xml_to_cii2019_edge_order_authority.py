import importlib.util
import math
import pathlib
import subprocess
import sys
import xml.etree.ElementTree as ET

import pytest

ROOT = pathlib.Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
SPEC = importlib.util.spec_from_file_location("xml_to_cii2019", ROOT / "xml_to_cii2019.py")
mod = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = mod
SPEC.loader.exec_module(mod)


def _add_node(
    branch: ET.Element,
    node_number: int,
    component_type: str,
    position: tuple[float, float, float],
    *,
    endpoint: int | None = None,
    component_ref_no: str = "",
    rigid: int | None = None,
) -> ET.Element:
    node = ET.SubElement(branch, "Node")
    fields = {
        "NodeNumber": str(node_number),
        "ComponentType": component_type,
        "ComponentRefNo": component_ref_no,
        "OutsideDiameter": "60.3",
        "WallThickness": "3.9",
        "Position": " ".join(f"{value:.2f}" for value in position),
    }
    if endpoint is not None:
        fields["Endpoint"] = str(endpoint)
    if rigid is not None:
        fields["Rigid"] = str(rigid)
    for name, value in fields.items():
        ET.SubElement(node, name).text = value
    return node


def _add_branch(root: ET.Element, name: str) -> ET.Element:
    pipe = root.find("Pipe")
    assert pipe is not None
    branch = ET.SubElement(pipe, "Branch")
    ET.SubElement(branch, "Branchname").text = name
    temperature = ET.SubElement(branch, "Temperature")
    ET.SubElement(temperature, "Temperature1").text = "0"
    pressure = ET.SubElement(branch, "Pressure")
    ET.SubElement(pressure, "Pressure1").text = "0"
    ET.SubElement(branch, "FluidDensity").text = "0"
    return branch


def _new_root() -> ET.Element:
    root = ET.Element("PipeStressExport")
    for name in ("DateTime", "Source", "Version", "UserName", "Purpose", "ProjectName", "MDBName", "TitleLine"):
        ET.SubElement(root, name)
    ET.SubElement(root, "RestrainOpenEnds").text = "No"
    ET.SubElement(root, "AmbientTemperature").text = "0"
    ET.SubElement(root, "Pipe")
    return root


def _add_reported_case(
    branch: ET.Element,
    *,
    x: float,
    start_number: int,
    flange_number: int,
    rigid_number: int,
    junction_number: int,
    flange_ref: str,
    blind_ref: str,
    junction_ref: str,
) -> None:
    _add_node(
        branch,
        start_number,
        "FLAN",
        (x, 106803.93, 101229.30),
        endpoint=1,
        component_ref_no=f"{flange_ref}-START",
    )
    _add_node(
        branch,
        flange_number,
        "FLAN",
        (x, 106912.93, 101229.30),
        endpoint=2,
        component_ref_no=flange_ref,
    )
    # Source provenance marker: this negative FBLI record is intentionally
    # filtered from XmlNode output but its ComponentRefNo authorizes the paired
    # positive RIGID as a blind-flange terminal closure.
    _add_node(
        branch,
        -1,
        "FBLI",
        (x, 106916.13, 101229.30),
        endpoint=1,
        component_ref_no=blind_ref,
    )
    _add_node(
        branch,
        rigid_number,
        "RIGID",
        (x, 106916.13, 101229.30),
        endpoint=2,
        component_ref_no=blind_ref,
        rigid=2,
    )
    _add_node(
        branch,
        junction_number,
        "BRAN",
        (x, 106886.13, 101229.30),
        endpoint=2,
        component_ref_no=junction_ref,
    )


def _write_xml(tmp_path: pathlib.Path, root: ET.Element, name: str = "fixture.xml") -> pathlib.Path:
    path = tmp_path / name
    ET.ElementTree(root).write(path, encoding="unicode")
    return path


def _edge_pairs(branches: list[mod.XmlBranch]) -> list[tuple[int, int]]:
    return [
        (edge.from_node.node_number, edge.to_node.node_number)
        for edge in mod._build_edges(branches)
    ]


def _cii_element_pairs(path: pathlib.Path) -> list[tuple[int, int]]:
    lines = path.read_text(encoding="utf-8").splitlines()
    start = lines.index("#$ ELEMENTS") + 1
    payload: list[str] = []
    for line in lines[start:]:
        if line.startswith("#$ "):
            break
        payload.append(line)
    assert len(payload) % 15 == 0
    pairs: list[tuple[int, int]] = []
    for index in range(0, len(payload), 15):
        fields = payload[index].split()
        pairs.append((int(float(fields[0])), int(float(fields[1]))))
    return pairs


def test_reported_2439_and_2909_cases_use_source_semantic_topology(tmp_path):
    mod.TOPOLOGY_NORMALIZATION_EVENTS.clear()
    root = _new_root()

    branch_a = _add_branch(root, '/GLRD-1000-2"-P4110023-93833-01/B4')
    _add_reported_case(
        branch_a,
        x=104000.0,
        start_number=2430,
        flange_number=2439,
        rigid_number=2440,
        junction_number=2450,
        flange_ref="=134234934/25983",
        blind_ref="=134234934/25985",
        junction_ref="=134234934/25955",
    )

    branch_b = _add_branch(root, '/GLRD-1000-2"-P4110028-93833-01/B4')
    _add_reported_case(
        branch_b,
        x=102600.0,
        start_number=2900,
        flange_number=2909,
        rigid_number=2910,
        junction_number=2920,
        flange_ref="=134234934/26047",
        blind_ref="=134234934/26049",
        junction_ref="=134234934/26019",
    )

    document = mod._parse_xml_document(_write_xml(tmp_path, root, "reported.xml"))

    assert [[node.node_number for node in branch.nodes] for branch in document.branches] == [
        [2430, 2450, 2439, 2440],
        [2900, 2920, 2909, 2910],
    ]

    pairs = _edge_pairs(document.branches)
    assert (2439, 2450) not in pairs
    assert (2909, 2920) not in pairs
    assert (2450, 2439) in pairs
    assert (2439, 2440) in pairs
    assert (2920, 2909) in pairs
    assert (2909, 2910) in pairs

    for branch, junction_number, flange_number, rigid_number in (
        (document.branches[0], 2450, 2439, 2440),
        (document.branches[1], 2920, 2909, 2910),
    ):
        by_number = {node.node_number: node for node in branch.nodes}
        junction = by_number[junction_number]
        flange = by_number[flange_number]
        rigid = by_number[rigid_number]
        assert flange.component_type == "FLAN"
        assert rigid.component_type == "RIGID"
        assert rigid.source_blind_flange_closure is True
        assert math.dist(junction.position, flange.position) == pytest.approx(26.8, abs=1.0e-6)
        assert math.dist(flange.position, rigid.position) == pytest.approx(3.2, abs=1.0e-6)

    assert sum("inserted BRAN endpoint-2" in event for event in mod.TOPOLOGY_NORMALIZATION_EVENTS) == 2


def test_protected_terminal_is_withheld_from_runtime_short_span_override(tmp_path, monkeypatch):
    root = _new_root()
    branch = _add_branch(root, "/RUNTIME-OVERRIDE/B1")
    _add_reported_case(
        branch,
        x=104000.0,
        start_number=2430,
        flange_number=2439,
        rigid_number=2440,
        junction_number=2450,
        flange_ref="=F",
        blind_ref="=FBLI",
        junction_ref="=BRAN",
    )

    seen: list[list[int]] = []

    def runtime_cleaner(branches, threshold_mm=mod.SHORT_ELEMENT_LENGTH_DROP_THRESHOLD_MM):
        del threshold_mm
        seen.extend([[node.node_number for node in item.nodes] for item in branches])
        assert all(2440 not in numbers for numbers in seen)
        return branches

    monkeypatch.setattr(mod, "_drop_short_element_nodes", runtime_cleaner)
    document = mod._parse_xml_document(_write_xml(tmp_path, root, "override.xml"))

    assert seen == [[2430, 2450, 2439]]
    assert [node.node_number for node in document.branches[0].nodes] == [2430, 2450, 2439, 2440]


def test_contracted_production_entrypoint_keeps_source_semantic_terminal(tmp_path):
    root = _new_root()
    branch = _add_branch(root, '/GLRD-1000-2"-P4110023-93833-01/B4')
    _add_reported_case(
        branch,
        x=104000.0,
        start_number=2430,
        flange_number=2439,
        rigid_number=2440,
        junction_number=2450,
        flange_ref="=134234934/25983",
        blind_ref="=134234934/25985",
        junction_ref="=134234934/25955",
    )
    xml_path = _write_xml(tmp_path, root, "contracted.xml")
    cii_path = tmp_path / "contracted.cii"

    completed = subprocess.run(
        [
            sys.executable,
            str(ROOT / "xml_to_cii2019_contracted_direction.py"),
            "--input",
            str(xml_path),
            "--output",
            str(cii_path),
            "--coords-mode",
            "first",
        ],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    assert completed.returncode == 0, completed.stdout + "\n" + completed.stderr

    pairs = _cii_element_pairs(cii_path)
    assert (2439, 2450) not in pairs
    assert (2430, 2450) in pairs
    assert (2450, 2439) in pairs
    assert (2439, 2440) in pairs


@pytest.mark.parametrize(
    ("junction_y", "expected_host_count"),
    [
        (250.0, 0),
        (50.0, 3),
    ],
)
def test_no_or_ambiguous_host_keeps_original_order(tmp_path, junction_y, expected_host_count):
    mod.TOPOLOGY_NORMALIZATION_EVENTS.clear()
    root = _new_root()
    branch = _add_branch(root, f"/FAIL-CLOSED-{expected_host_count}/B1")
    _add_node(branch, 10, "PIPE", (0.0, 0.0, 0.0))
    _add_node(branch, 20, "PIPE", (0.0, 100.0, 0.0))
    _add_node(branch, 30, "PIPE", (0.0, 0.0, 0.0))
    _add_node(branch, 40, "FLAN", (0.0, 100.0, 0.0), endpoint=2, component_ref_no="=F")
    _add_node(branch, -1, "FBLI", (0.0, 110.0, 0.0), endpoint=1, component_ref_no="=BLIND")
    _add_node(
        branch,
        50,
        "RIGID",
        (0.0, 110.0, 0.0),
        endpoint=2,
        component_ref_no="=BLIND",
        rigid=2,
    )
    _add_node(branch, 60, "BRAN", (0.0, junction_y, 0.0), endpoint=2, component_ref_no="=J")

    document = mod._parse_xml_document(_write_xml(tmp_path, root, f"fail-{expected_host_count}.xml"))

    assert [node.node_number for node in document.branches[0].nodes] == [10, 20, 30, 40, 50, 60]
    assert any(
        f"host resolution returned {expected_host_count} segments" in event
        for event in mod.TOPOLOGY_NORMALIZATION_EVENTS
    )


def test_blind_terminal_without_trailing_bran_retains_existing_cleanup_behavior(tmp_path):
    root = _new_root()
    branch = _add_branch(root, "/NO-TAIL-BRAN/B1")
    _add_node(branch, 100, "FLAN", (0.0, 0.0, 0.0), endpoint=1, component_ref_no="=A")
    _add_node(branch, 109, "FLAN", (0.0, 100.0, 0.0), endpoint=2, component_ref_no="=B")
    _add_node(branch, -1, "FBLI", (0.0, 103.2, 0.0), endpoint=1, component_ref_no="=C")
    _add_node(
        branch,
        110,
        "RIGID",
        (0.0, 103.2, 0.0),
        endpoint=2,
        component_ref_no="=C",
        rigid=2,
    )

    document = mod._parse_xml_document(_write_xml(tmp_path, root, "no-tail.xml"))

    # The new topology rule is intentionally not activated without the
    # appended BRAN endpoint-2 pattern; existing generic short cleanup remains.
    assert [node.node_number for node in document.branches[0].nodes] == [100, 109]


def test_negative_coordinate_reducer_and_tee_order_is_not_globally_rewritten(tmp_path):
    root = _new_root()
    branch = _add_branch(root, "/NEGATIVE-CONTROL/B1")
    _add_node(branch, 10, "PIPE", (-300.0, 0.0, 0.0))
    _add_node(branch, 20, "REDU", (-200.0, 0.0, 0.0), endpoint=2, component_ref_no="=REDU")
    _add_node(branch, 30, "TEE", (-100.0, 0.0, 0.0), endpoint=1, component_ref_no="=TEE")
    _add_node(branch, 40, "PIPE", (0.0, 0.0, 0.0))

    document = mod._parse_xml_document(_write_xml(tmp_path, root, "negative-control.xml"))

    assert [node.node_number for node in document.branches[0].nodes] == [10, 20, 30, 40]
    assert _edge_pairs(document.branches) == [(10, 20), (20, 30), (30, 40)]
