import importlib.util
import pathlib
import sys
import textwrap

import pytest

ROOT = pathlib.Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
SPEC = importlib.util.spec_from_file_location("xml_to_cii2019", ROOT / "xml_to_cii2019.py")
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def _write_fixture(tmp_path: pathlib.Path, *, include_effective: bool) -> pathlib.Path:
    effective = "<EffectiveOutsideDiameter>60.3</EffectiveOutsideDiameter>" if include_effective else ""
    xml = tmp_path / ("effective.xml" if include_effective else "raw-only.xml")
    xml.write_text(
        textwrap.dedent(
            f"""
            <PipeStressExport>
              <DateTime/><Source/><Version/><UserName/><Purpose/><ProjectName/><MDBName/><TitleLine/>
              <RestrainOpenEnds>No</RestrainOpenEnds><AmbientTemperature>0</AmbientTemperature>
              <Pipe>
                <Branch>
                  <Branchname>/OD-AUTH/B1</Branchname>
                  <Temperature><Temperature1>0</Temperature1></Temperature>
                  <Pressure><Pressure1>0</Pressure1></Pressure>
                  <FluidDensity>0</FluidDensity>
                  <Node>
                    <NodeNumber>10</NodeNumber><ComponentType>PIPE</ComponentType>
                    <OutsideDiameter>60.3</OutsideDiameter><WallThickness>3.9</WallThickness>
                    <Position>0 0 0</Position>
                  </Node>
                  <Node>
                    <NodeNumber>20</NodeNumber><Endpoint>2</Endpoint><ComponentType>FLAN</ComponentType>
                    <ComponentRefNo>=F1</ComponentRefNo><OutsideDiameter>26.7</OutsideDiameter>{effective}
                    <WallThickness>3.9</WallThickness><Position>100 0 0</Position>
                  </Node>
                  <Node>
                    <NodeNumber>30</NodeNumber><ComponentType>PIPE</ComponentType>
                    <OutsideDiameter>60.3</OutsideDiameter><WallThickness>3.9</WallThickness>
                    <Position>200 0 0</Position>
                  </Node>
                </Branch>
              </Pipe>
            </PipeStressExport>
            """
        ).strip(),
        encoding="utf-8",
    )
    return xml


def test_parser_retains_raw_od_and_reads_additive_effective_od(tmp_path):
    document = mod._parse_xml_document(_write_fixture(tmp_path, include_effective=True))
    flange = next(node for branch in document.branches for node in branch.nodes if node.node_number == 20)

    assert flange.outside_diameter == pytest.approx(26.7)
    assert flange.effective_outside_diameter == pytest.approx(60.3)


def test_element_od_prefers_effective_authority_without_overwriting_raw(tmp_path):
    document = mod._parse_xml_document(_write_fixture(tmp_path, include_effective=True))
    edge = next(edge for edge in mod._build_edges(document.branches) if edge.from_node.node_number == 20)

    assert edge.from_node.outside_diameter == pytest.approx(26.7)
    assert mod._element_outside_diameter(edge) == pytest.approx(60.3)


def test_element_od_falls_back_to_raw_when_no_effective_authority_exists(tmp_path):
    document = mod._parse_xml_document(_write_fixture(tmp_path, include_effective=False))
    edge = next(edge for edge in mod._build_edges(document.branches) if edge.from_node.node_number == 20)

    assert edge.from_node.outside_diameter == pytest.approx(26.7)
    assert edge.from_node.effective_outside_diameter is None
    assert mod._element_outside_diameter(edge) == pytest.approx(26.7)
