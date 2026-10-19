#!/usr/bin/env python3
"""Exercise actual Python CLI candidate witness; no owner source or release."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
NATIVE = ROOT / "converters" / "scripts"
sys.path.insert(0, str(NATIVE))
from xml229_native_candidate_witness import parse_cii

def fixture():
    nodes = [
        ("BRAN", "0", "0", "B0"),
        ("RIGID", "2", "35", "R1"),
        ("VALV", "", "45", "V1"),
        ("INST", "", "50", "I1"),
    ]
    lines = []
    for i, (kind, rigid, mass, ref) in enumerate(nodes):
        lines.append(
            "<Node><NodeNumber>%d</NodeNumber><Position>%d 0 0</Position>"
            "<ComponentType>%s</ComponentType><ComponentRefNo>%s</ComponentRefNo>"
            "<Endpoint>2</Endpoint><Rigid>%s</Rigid><Weight>%s</Weight>"
            "<OutsideDiameter>610</OutsideDiameter></Node>"
            % (10 + 10*i, 100*i, kind, ref, rigid, mass))
    return ("<PipeStressExport xmlns='http://aveva.com/pipeStress116.xsd'>"
            "<Pipe><Branch><Branchname>/PUBLIC/B1</Branchname>"
            + "".join(lines) + "</Branch></Pipe></PipeStressExport>")

class CandidateNativeWitnessTests(unittest.TestCase):
    def invoke(self, directory, *, witness=True):
        root = Path(directory)
        xml = root / "candidate-engine.xml"
        cii = root / ("with-witness.cii" if witness else "plain.cii")
        sidecar = root / "private-observation.json"
        xml.write_text(fixture(), encoding="utf-8")
        cmd=[sys.executable,str(NATIVE / "xml_to_cii2019_runtime_custody.py"),
             "--input",str(xml),"--output",str(cii),"--weight-scale","10"]
        if witness:
            cmd.extend(["--xml229-native-candidate-witness-out",str(sidecar)])
        result = subprocess.run(cmd,capture_output=True,text=True,timeout=50)
        self.assertEqual(result.returncode,0,result.stderr[-2500:])
        self.assertTrue(cii.exists())
        return xml,cii,sidecar

    def test_same_real_native_output_with_and_without_candidate_observation(self):
        with tempfile.TemporaryDirectory() as td:
            xml,cii,sidecar=self.invoke(td)
            proof=json.loads(sidecar.read_text(encoding="utf-8"))
            self.assertEqual(proof["schema"],
                "XML229.NativeRetainedCandidateWitness.v1")
            self.assertEqual(proof["modelElementCount"],3)
            self.assertEqual(proof["modelRigidCount"],1)
            self.assertEqual(proof["weightScale"],"10")
            self.assertEqual(proof["engineInputSha256"],
                hashlib.sha256(xml.read_bytes()).hexdigest())
            self.assertEqual(proof["ciiSha256"],
                hashlib.sha256(cii.read_bytes()).hexdigest())
            pointers,rigid=parse_cii(cii.read_text(encoding="utf-8"))
            self.assertEqual(len(pointers),len(proof["edges"]))
            self.assertEqual(sum(item["rigidRecordIndex"] is not None
                                 for item in proof["edges"]),1)
            self.assertEqual(proof["edges"][0]["to"]["componentType"],"RIGID")
            self.assertIsNone(proof["edges"][1]["rigidRecordIndex"])
            self.assertEqual(proof["edges"][1]["to"]["componentType"],"VALV")
            self.assertFalse(proof["physicalMatch2ConsumptionVerified"])
            self.assertFalse(proof["nativeCiiReleaseAuthorized"])
            self.assertFalse(proof["nativeCiiPhysicalSlotVerified"])
            _,ordinary,_=self.invoke(td,witness=False)
            self.assertEqual(cii.read_bytes(),ordinary.read_bytes())

    def test_duplicate_and_orphan_pointers_are_refused(self):
        with tempfile.TemporaryDirectory() as td:
            _,cii,_=self.invoke(td)
            txt=cii.read_text(encoding="utf-8")
            original,_=parse_cii(txt)
            self.assertEqual(len(original),3)
            # Corrupt a second ELEMENTS pointer, but not any Python model.
            lines=txt.splitlines()
            section=lines.index("#$ ELEMENTS")
            lines[section+1+15+12]=lines[section+1+12]
            with self.assertRaisesRegex(ValueError,"DUPLICATE_RIGID_POINTER"):
                parse_cii("\n".join(lines)+"\n")
            lines=txt.splitlines()
            lines[section+1+12]=lines[section+1+15+12]
            with self.assertRaisesRegex(ValueError,"ORPHAN_RIGID_SLOT"):
                parse_cii("\n".join(lines)+"\n")

if __name__ == "__main__":
    unittest.main()
