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
    NativeMassError, bind_native_final_xml, verify_emitted_native_masses,
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

if __name__=="__main__":
    unittest.main()
