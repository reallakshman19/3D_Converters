import importlib.util
import pathlib
import sys
import textwrap
import xml.etree.ElementTree as ET

import pytest

ROOT = pathlib.Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
SPEC = importlib.util.spec_from_file_location("xml_to_cii2019_patched", ROOT / "xml_to_cii2019_patched.py")
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def _node(parent: ET.Element, node_number: int, component_type: str, position: str, element_length_mm: float) -> ET.Element:
    node = ET.SubElement(parent, "Node")
    fields = {
        "NodeNumber": str(node_number),
        "Endpoint": "1",
        "ComponentType": component_type,
        "Weight": "0",
        "OutsideDiameter": "168.3",
        "WallThickness": "7.1",
        "InsulationThickness": "0",
        "ElementLengthMm": str(element_length_mm),
        "Position": position,
    }
    for name, value in fields.items():
        ET.SubElement(node, name).text = value
    return node


def _negative_node_fixture(component_type: str, element_length_mm: float = 25.0) -> tuple[ET.Element, ET.Element]:
    root = ET.Element("PipeStressExport")
    branch = ET.SubElement(root, "Branch")
    _node(branch, 10, "PIPE", "0 0 0", 100.0)
    target = _node(branch, -1, component_type, "111348.13 107175.33 100916.75", element_length_mm)
    _node(branch, 20, "PIPE", "125 0 0", 100.0)
    return root, target


def test_negative_node_component_taxonomy_is_explicit_and_fail_closed():
    assert mod._negative_node_component_family("FLAN") == "FLANGE_FAMILY"
    assert mod._negative_node_component_family("fbli") == "FLANGE_FAMILY"
    assert mod._negative_node_component_family("RIGID") == "RIGID"
    assert mod._negative_node_component_family("INST") is None


@pytest.mark.parametrize(
    ("component_type", "should_renumber"),
    [("FBLI", True), ("FLAN", True), ("RIGID", True), ("INST", False)],
)
def test_negative_node_renumbering_respects_component_family(component_type: str, should_renumber: bool):
    root, target = _negative_node_fixture(component_type)

    changed = mod._renumber_length_bearing_negative_nodes(root, "")
    node_number = int(target.findtext("NodeNumber"))

    assert changed is should_renumber
    if should_renumber:
        assert node_number == 19
    else:
        assert node_number == -1


def test_negative_fbli_without_element_length_remains_fail_closed():
    root, target = _negative_node_fixture("FBLI", element_length_mm=0.0)

    assert mod._renumber_length_bearing_negative_nodes(root, "") is False
    assert int(target.findtext("NodeNumber")) == -1


def test_reported_fbli_record_survives_enrichment_parser_and_conversion_model(tmp_path):
    xml = tmp_path / "fbli.xml"
    xml.write_text(
        textwrap.dedent(
            """
            <PipeStressExport>
              <DateTime/><Source/><Version/><UserName/><Purpose/><ProjectName/><MDBName/><TitleLine/>
              <RestrainOpenEnds>No</RestrainOpenEnds><AmbientTemperature>0</AmbientTemperature>
              <Pipe><FullName>/P</FullName><Ref>=P</Ref>
                <Branch>
                  <Branchname>/GLRD-1000-FBLI/B1</Branchname>
                  <Temperature><Temperature1>0</Temperature1><Temperature2>0</Temperature2><Temperature3>0</Temperature3></Temperature>
                  <Pressure><Pressure1>0</Pressure1></Pressure>
                  <MaterialNumber>106</MaterialNumber><InsulationDensity>0</InsulationDensity><FluidDensity>0</FluidDensity>
                  <Node><NodeNumber>10</NodeNumber><ComponentType>PIPE</ComponentType><OutsideDiameter>168.3</OutsideDiameter><WallThickness>7.1</WallThickness><Weight>0</Weight><InsulationThickness>0</InsulationThickness><ElementLengthMm>100</ElementLengthMm><Position>111248.13 107175.33 100916.75</Position></Node>
                  <Node><NodeNumber>-1</NodeNumber><Endpoint>1</Endpoint><ComponentType>FBLI</ComponentType><Weight>0</Weight><OutsideDiameter>168.3</OutsideDiameter><WallThickness>7.1</WallThickness><InsulationThickness>0</InsulationThickness><ElementLengthMm>25</ElementLengthMm><Position>111348.13 107175.33 100916.75</Position></Node>
                  <Node><NodeNumber>20</NodeNumber><ComponentType>PIPE</ComponentType><OutsideDiameter>168.3</OutsideDiameter><WallThickness>7.1</WallThickness><Weight>0</Weight><InsulationThickness>0</InsulationThickness><ElementLengthMm>100</ElementLengthMm><Position>111373.13 107175.33 100916.75</Position></Node>
                </Branch>
              </Pipe>
            </PipeStressExport>
            """
        ).strip(),
        encoding="utf-8",
    )

    enriched = mod._apply_process_data_to_xml(xml, mod._load_support_config(None))
    enriched_root = ET.parse(enriched).getroot()
    fbli_xml = next(node for node in enriched_root.findall(".//Node") if node.findtext("ComponentType") == "FBLI")
    assert int(fbli_xml.findtext("NodeNumber")) == 19

    document = mod.base._parse_xml_document(enriched)
    fbli_nodes = [node for branch in document.branches for node in branch.nodes if node.component_type == "FBLI"]
    assert len(fbli_nodes) == 1
    assert fbli_nodes[0].node_number == 19
    assert fbli_nodes[0].outside_diameter == pytest.approx(168.3)

    model = mod._build_conversion_model(document, {}, {})
    assert len(model.edges) == 2
    assert any(
        edge.from_node.component_type == "FBLI" or edge.to_node.component_type == "FBLI"
        for edge in model.edges
    )
