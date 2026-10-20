"""Independent unit negatives for strict original-Final -> actual CII mass writer."""
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import hashlib
import json
import sys
import subprocess
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"converters"/"scripts"))
from xml229_native_final_mass_binding import (
    NativeMassError, bind_native_final_xml, stage_native_original_lineage,
    assert_preaccepted_geometry_unchanged, assert_native_model_geometry_unchanged,
    verify_emitted_native_masses,
)

def input_xml(weight="0"):
    return ("""<PipeStressExport><Pipe><Branch><Branchname>BR-1</Branchname>
<Node><NodeNumber>10</NodeNumber><ComponentType>PIPE</ComponentType>
<Position>0 0 0</Position><Weight>0</Weight></Node>
<Node><NodeNumber>20</NodeNumber><NodeName>WGT</NodeName>
<ComponentType>RIGID</ComponentType><ComponentRefNo>REF-1</ComponentRefNo>
<Endpoint>2</Endpoint><Position>5 0 0</Position><Rigid>2</Rigid>
<Weight>"""+weight+"""</Weight></Node>
</Branch></Pipe></PipeStressExport>""")

def packet(xml,kg=12.5,signature=None):
    sig=signature or ["RIGID","REF-1","2","WGT"]
    source="SOURCE"
    return {"schema":"XML229.NativeFinalPhysicalPacket.v1",
            "basisId":"a"*64,"finalIntentSha256":"b"*64,
            "sourceId":source,"sourceXmlSha256":hashlib.sha256(xml.encode()).hexdigest(),
            "physicalCount":1,
            "components":[{"occurrenceId":json.dumps([source,0,1,json.dumps(sig,separators=(",",":"))],
                                                   separators=(",",":")),
                           "effectiveKg":kg}]}

def cii(force="125",pointer="1"):
    rows=["10 20 0 0 0 0"]
    rows+=["0 0 0 0 0 0"]*11
    rows+=["0 "+pointer+" 0 0 0 0"]
    rows+=["0 0 0 0 0 0","0 0 0"]
    return ("#$ CONTROL\n1 0 0 0 0 0\n0 1 0 0 0 0\n0 0 0 0 0 0\n0\n"
            "#$ ELEMENTS\n"+"\n".join(rows)+"\n"
            "#$ RIGID\n"+force+" 0\n#$ UNITS\nN.\n")

def model(kg):
    node=SimpleNamespace(source_node_number=None,node_number=20,
                         component_type="RIGID",component_ref_no="REF-1",endpoint=2,
                         position=(5.,0.,0.),weight=kg)
    return SimpleNamespace(rigid_edges=[
        SimpleNamespace(branch_name="BR-1",to_node=node)])

class NativeFinalMassTests(unittest.TestCase):
    def test_exact_original_owner_becomes_weighted_native_xml_and_is_reconciled(self):
        with TemporaryDirectory() as td:
            original=Path(td)/"source.xml"
            transformed=Path(td)/"engine.xml"
            manifest=Path(td)/"packet.json"
            xml=input_xml()
            original.write_text(xml)
            transformed.write_text(xml)
            manifest.write_text(json.dumps(packet(xml)))
            output,owners=bind_native_final_xml(original,transformed,manifest)
            self.assertIn("<Weight>12.5</Weight>",output.read_text())
            self.assertEqual(len(owners),1)
            evidence=verify_emitted_native_masses(cii(),owners,model(12.5))
            self.assertTrue(evidence["massesConsumedInNativeRigid"])
            self.assertFalse(evidence["nativeCiiReleaseAuthorized"])
            self.assertEqual(evidence["claims"][0]["nativeElementIndex"],0)
            for altered,code in [("126","CII_NATIVE_APPLIED_MASS_MISMATCH")]:
                with self.assertRaises(NativeMassError) as e:
                    verify_emitted_native_masses(cii(force=altered),owners,model(12.5))
                self.assertEqual(e.exception.code,code)
            with self.assertRaises(NativeMassError) as e:
                verify_emitted_native_masses(cii(pointer="0"),owners,model(12.5))
            self.assertEqual(e.exception.code,"CII_RIGID_ORPHANED")

    def test_actual_python_runtime_writes_and_reconciles_emitted_cii(self):
        with TemporaryDirectory() as td:
            directory=Path(td)
            original=directory/"source.xml"
            packet_path=directory/"packet.json"
            output=directory/"native.cii"
            proof=directory/"proof.json"
            xml=input_xml()
            original.write_text(xml)
            packet_path.write_text(json.dumps(packet(xml)))
            runner=Path(__file__).resolve().parents[1]/"converters"/"scripts"/"xml_to_cii2019_runtime_custody.py"
            process=subprocess.run([
                sys.executable,str(runner),"--input",str(original),
                "--output",str(output),"--weight-scale","10",
                "--xml229-native-final-packet",str(packet_path),
                "--xml229-native-mass-proof",str(proof),
            ],capture_output=True,text=True)
            self.assertEqual(process.returncode,0,process.stderr)
            self.assertTrue(output.exists(),"Real native converter must publish .cii")
            native=output.read_text()
            result=json.loads(proof.read_text())
            self.assertEqual(result["actualCiiSha256"],
                hashlib.sha256(native.encode("utf-8")).hexdigest())
            self.assertTrue(result["massesConsumedInNativeRigid"])
            self.assertFalse(result["nativeCiiReleaseAuthorized"])
            self.assertIn("125",native.split("#$ RIGID",1)[1].split("#$",1)[0])
            # Confirmed zero has a real native owner, CII pointer and 0 force.
            packet_path.write_text(json.dumps(packet(xml,kg=0)))
            output.unlink()
            proof.unlink()
            process=subprocess.run([
                sys.executable,str(runner),"--input",str(original),
                "--output",str(output),"--weight-scale","10",
                "--xml229-native-final-packet",str(packet_path),
                "--xml229-native-mass-proof",str(proof),
            ],capture_output=True,text=True)
            self.assertEqual(process.returncode,0,process.stderr)
            self.assertTrue(output.exists())
            self.assertEqual(json.loads(proof.read_text())["claims"][0]["massKg"],0)
            self.assertIn("0",output.read_text().split("#$ RIGID",1)[1].split("#$",1)[0])

    def test_altered_source_or_duplicate_owner_never_applies_mass(self):
        with TemporaryDirectory() as td:
            original=Path(td)/"source.xml"
            transformed=Path(td)/"engine.xml"
            manifest=Path(td)/"packet.json"
            xml=input_xml()
            original.write_text(xml)
            transformed.write_text(xml)
            doc=packet(xml)
            manifest.write_text(json.dumps(doc))
            original.write_text(xml.replace("REF-1","DIFFERENT"))
            with self.assertRaises(NativeMassError) as e:
                bind_native_final_xml(original,transformed,manifest)
            self.assertEqual(e.exception.code,"ORIGINAL_SOURCE_SHA_DRIFT")
            original.write_text(xml)
            transformed.write_text(xml.replace("<Rigid>2</Rigid>","<Rigid>0</Rigid>"))
            with self.assertRaises(NativeMassError) as e:
                bind_native_final_xml(original,transformed,manifest)
            self.assertEqual(e.exception.code,"NATIVE_RIGID_OWNER_UNSUPPORTED")
            transformed.write_text(xml.replace("<NodeNumber>20</NodeNumber>",
                "<NodeNumber>21</NodeNumber>"))
            with self.assertRaises(NativeMassError) as e:
                bind_native_final_xml(original,transformed,manifest)
            self.assertEqual(e.exception.code,"NATIVE_OWNER_LINEAGE_AMBIGUOUS")
            transformed.write_text(xml)
            doc["components"][0]["effectiveKg"]=0
            manifest.write_text(json.dumps(doc))
            output,owners=bind_native_final_xml(original,transformed,manifest)
            self.assertEqual(owners[0]["kg"],0)
            self.assertIn("<Weight>0</Weight>",output.read_text())
            with self.assertRaises(NativeMassError) as e:
                verify_emitted_native_masses(cii(force="1"),owners,model(0))
            self.assertEqual(e.exception.code,"CII_NATIVE_APPLIED_MASS_MISMATCH")


    def test_emitted_scientific_format_matches_actual_formatter(self):
        # Native formatter uses seven significant digits in E-notation, not
        # six; an unrelated tiny output deviation must still fail closed.
        xml=input_xml()
        with TemporaryDirectory() as td:
            original=Path(td)/"original.xml"
            enriched=Path(td)/"engine.xml"
            manifest=Path(td)/"packet.json"
            original.write_text(xml)
            enriched.write_text(xml)
            tiny=0.00000001234567
            manifest.write_text(json.dumps(packet(xml,kg=tiny)))
            _,owners=bind_native_final_xml(original,enriched,manifest)
            proof=verify_emitted_native_masses(
                cii(force="1.234567E-07"),owners,model(tiny))
            self.assertEqual(proof["claims"][0]["massKg"],tiny)
            with self.assertRaises(NativeMassError) as e:
                verify_emitted_native_masses(
                    cii(force="1.234568E-07"),owners,model(tiny))
            self.assertEqual(e.exception.code,"CII_NATIVE_APPLIED_MASS_MISMATCH")
            huge=123456780.0
            manifest.write_text(json.dumps(packet(xml,kg=huge)))
            _,owners=bind_native_final_xml(original,enriched,manifest)
            verify_emitted_native_masses(
                cii(force="1.234568E+09"),owners,model(huge))


    def test_geometry_must_be_final_before_weight_acceptance(self):
        from xml.etree import ElementTree as ET
        with TemporaryDirectory() as td:
            original=Path(td)/"source.xml"
            engine=Path(td)/"engine.xml"
            original.write_text(input_xml())
            engine.write_text(input_xml())
            self.assertTrue(assert_preaccepted_geometry_unchanged(original,engine))
            for mutated in (
                input_xml().replace("<NodeNumber>20</NodeNumber>",
                                    "<NodeNumber>120</NodeNumber>"),
            ):
                engine.write_text(mutated)
                self.assertTrue(assert_preaccepted_geometry_unchanged(original,engine),
                    "Renumbering alone must not change finalized physical ownership")
            changed=[
                input_xml().replace("<Position>5 0 0</Position>",
                                    "<Position>5 1 0</Position>"),
                input_xml().replace("<ComponentType>RIGID</ComponentType>",
                                    "<ComponentType>VALV</ComponentType>"),
                input_xml().replace("<NodeNumber>20</NodeNumber>",
                                    "<NodeNumber>20</NodeNumber><Node><NodeNumber>30</NodeNumber><ComponentType>PIPE</ComponentType><Position>8 0 0</Position></Node>"),
            ]
            for mutated in changed:
                engine.write_text(mutated)
                with self.subTest(mutated=mutated[-80:]):
                    with self.assertRaises(NativeMassError) as exc:
                        assert_preaccepted_geometry_unchanged(original,engine)
                    self.assertEqual(exc.exception.code,
                        "NATIVE_GEOMETRY_CHANGED_AFTER_WEIGHT_ACCEPTANCE")

    def test_native_run_blocks_post_acceptance_short_element_cleanup(self):
        # Actual native parser drops short unweighted helpers. In a governed
        # source their topology must be finalized upstream, not after Final.
        with TemporaryDirectory() as td:
            directory=Path(td)
            original=directory/"source.xml"
            packet_path=directory/"packet.json"
            output=directory/"native.cii"
            proof=directory/"proof.json"
            xml=input_xml().replace(
                "</Node></Branch>",
                "</Node><Node><NodeNumber>30</NodeNumber>"
                "<ComponentType>PIPE</ComponentType>"
                "<Position>5.1 0 0</Position></Node></Branch>")
            original.write_text(xml)
            packet_path.write_text(json.dumps(packet(xml)))
            runner=Path(__file__).resolve().parents[1]/"converters"/"scripts"/"xml_to_cii2019_runtime_custody.py"
            process=subprocess.run([
                sys.executable,str(runner),"--input",str(original),
                "--output",str(output),"--weight-scale","10",
                "--xml229-native-final-packet",str(packet_path),
                "--xml229-native-mass-proof",str(proof),
            ],capture_output=True,text=True)
            self.assertNotEqual(process.returncode,0)
            self.assertIn("NATIVE_GEOMETRY_CHANGED_AFTER_WEIGHT_ACCEPTANCE",
                          process.stderr)
            self.assertFalse(output.exists())
            self.assertFalse(proof.exists())

    def test_staged_original_occurrence_survives_native_renumbering(self):
        with TemporaryDirectory() as td:
            original=Path(td)/"source.xml"
            transformed=Path(td)/"enriched.xml"
            packet_path=Path(td)/"packet.json"
            xml=input_xml()
            original.write_text(xml)
            packet_path.write_text(json.dumps(packet(xml)))
            staged=stage_native_original_lineage(original,packet_path)
            self.assertIn("XML229OriginalPhysicalId",staged.read_text())
            transformed.write_text(
                staged.read_text().replace(
                    "<NodeNumber>20</NodeNumber>","<NodeNumber>120</NodeNumber>"))
            bound,owners=bind_native_final_xml(
                original,transformed,packet_path,require_staged_lineage=True)
            self.assertEqual(owners[0]["nodeNumber"],"120")
            self.assertEqual(owners[0]["kg"],12.5)
            self.assertTrue(owners[0]["stagedLineage"])
            self.assertIn("<Weight>12.5</Weight>",bound.read_text())

    def test_staged_lineage_fail_closed_on_split_lost_and_spoofed_markers(self):
        with TemporaryDirectory() as td:
            original=Path(td)/"source.xml"
            transformed=Path(td)/"enriched.xml"
            packet_path=Path(td)/"packet.json"
            xml=input_xml()
            original.write_text(xml)
            packet_path.write_text(json.dumps(packet(xml)))
            staged=stage_native_original_lineage(original,packet_path)
            import xml.etree.ElementTree as ET
            tree=ET.parse(staged)
            branch=next(el for el in tree.getroot().iter()
                        if el.tag=="Branch")
            owner=next(node for node in branch if node.tag=="Node"
                       and node.find("XML229OriginalPhysicalId") is not None)
            import copy
            branch.append(copy.deepcopy(owner))
            tree.write(transformed,encoding="utf-8")
            with self.assertRaises(NativeMassError) as e:
                bind_native_final_xml(
                    original,transformed,packet_path,require_staged_lineage=True)
            self.assertEqual(e.exception.code,"NATIVE_CHILD_LINEAGE_MISSING_OR_SPLIT")
            transformed.write_text(xml)
            with self.assertRaises(NativeMassError) as e:
                bind_native_final_xml(
                    original,transformed,packet_path,require_staged_lineage=True)
            self.assertEqual(e.exception.code,"NATIVE_LINEAGE_STAGE_LOST")
            spoof=xml.replace("<Rigid>2</Rigid>",
                "<XML229OriginalPhysicalId>forged</XML229OriginalPhysicalId><Rigid>2</Rigid>")
            original.write_text(spoof)
            packet_path.write_text(json.dumps(packet(spoof)))
            with self.assertRaises(NativeMassError) as e:
                stage_native_original_lineage(original,packet_path)
            self.assertEqual(e.exception.code,"NATIVE_UNTRUSTED_LINEAGE_TAG")

if __name__=="__main__":
    unittest.main()
