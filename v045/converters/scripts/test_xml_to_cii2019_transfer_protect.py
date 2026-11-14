"""Owner D5 (13 Nov 2026): values a TopoFix transfer moved in win over the line list.
The CII engine re-applied the line list after the step-10 restore (review 14 Nov):
T1 127 -> 120 and density 110 -> 100. Invented data only."""
import importlib.util
import pathlib
import sys
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
SPEC = importlib.util.spec_from_file_location("xml_to_cii2019_patched", ROOT / "xml_to_cii2019_patched.py")
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)

NOTE = ('<!--TOPOFIX-TRANSFER-PROTECT {"v":1,"branches":{"/ASIM\u002d1885\u002d10\\"\u002dS8810101\u002d91261M7\u002dHC/B1":'
        '["Temperature/Temperature1","FluidDensity","Pressure/HydroPressure"]}}-->')


def _xml(tmp_path, note: bool):
    xml = tmp_path / "in.xml"
    xml.write_text(("<?xml version='1.0' encoding='utf-8'?>\n" + (NOTE + "\n" if note else "") +
                    '<PipeStressExport><Pipe><FullName>/P</FullName><Branch>'
                    '<Branchname>/ASIM-1885-10&quot;-S8810101-91261M7-HC/B1</Branchname>'
                    '<Temperature><Temperature1>127</Temperature1><Temperature2>0</Temperature2><Temperature3>0</Temperature3></Temperature>'
                    '<Pressure><Pressure1>0</Pressure1><HydroPressure>900</HydroPressure></Pressure>'
                    '<MaterialNumber>106</MaterialNumber><InsulationDensity>0</InsulationDensity><FluidDensity>110</FluidDensity>'
                    '<Node><NodeNumber>10</NodeNumber><ComponentType>PIPE</ComponentType><InsulationThickness>80</InsulationThickness></Node>'
                    '</Branch></Pipe></PipeStressExport>'), encoding="utf-8")
    return xml


def _cfg():
    return {"insulationDensityDefault": 210, "linelist": {
        "lineKeyTokenPositions": "4",
        "masterRows": [{"lineNo": "S8810101", "T1": "120", "T2": "60", "T3": "5", "Mixed kg/m3": "100", "Test Pressure": "15000"}],
        "fieldMap": {"t1": "T1", "t2": "T2", "t3": "T3", "densityMixed": "Mixed kg/m3", "hydroPressure": "Test Pressure"}}}


def test_listed_values_survive_the_engine_line_list_pass(tmp_path):
    branch = ET.parse(mod._apply_process_data_to_xml(_xml(tmp_path, True), _cfg())).getroot().find(".//Branch")
    assert branch.findtext("Temperature/Temperature1") == "127"
    assert branch.findtext("FluidDensity") == "110"
    assert branch.findtext("Pressure/HydroPressure") == "900"
    assert branch.findtext("Temperature/Temperature2") == "60", "an unlisted field still takes the line list"
    assert branch.findtext("InsulationDensity") == "210.0"


def test_without_the_note_the_line_list_wins_as_before(tmp_path):
    branch = ET.parse(mod._apply_process_data_to_xml(_xml(tmp_path, False), _cfg())).getroot().find(".//Branch")
    assert branch.findtext("Temperature/Temperature1") == "120"
    assert branch.findtext("FluidDensity") == "100"
    assert branch.findtext("Pressure/HydroPressure") == "15000"


def test_the_note_read_from_the_original_input_survives_a_temp_copy(tmp_path):
    cfg = _cfg()
    cfg["_transferProtect"] = mod._load_transfer_protection(_xml(tmp_path, True))
    copy = tmp_path / "copy.xml"  # what an ElementTree rewrite leaves: no comment
    ET.parse(_xml(tmp_path, True)).write(copy, encoding="unicode")
    assert "TOPOFIX" not in copy.read_text(encoding="utf-8")
    branch = ET.parse(mod._apply_process_data_to_xml(copy, cfg)).getroot().find(".//Branch")
    assert branch.findtext("Temperature/Temperature1") == "127"
