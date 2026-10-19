"""Held-out G5 CII ELEMENTS/RIGID physical-child challenge: synthetic only."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
def load(name,path):
    spec=importlib.util.spec_from_file_location(name,path)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
G5=load("g5_native_element_lineage",ROOT/"scripts/xml229-g5-native-element-lineage.py")
OLD=load("gc_pw_fixture",ROOT/"tests/gc-pw-v1-cii-mass-oracle.test.py")
sha=lambda b:hashlib.sha256(b).hexdigest()

def cii_with_elements(weights, pointers=None):
    count=len(weights)
    if pointers is None:pointers=list(range(1,count+1))
    body=OLD.cii(weights)
    header="0 0 0 0 0 0\n0 "+str(count)+" 0 0 0 0"
    assert header in body
    body=body.replace(header,str(count)+" 0 0 0 0 0\n0 "+str(count)+" 0 0 0 0")
    rows=[]
    for i,pointer in enumerate(pointers):
        block=["0 0 0 0 0 0"]*15
        block[0]=f"{100+10*i}.000 {110+10*i}.000 0 0 0 0"
        block[12]=f"0 {pointer} 0 0 0 0"
        block[14]="0 0 0"
        rows.extend(block)
    return body.replace("#$ RIGID\n",
                        "#$ ELEMENTS\n"+"\n".join(rows)+"\n#$ RIGID\n")

def fixture(td,split=True):
    ledger=OLD.make_case(td,split=split)
    weights=["600","607.34"] if split else ["1207.34"]
    data=cii_with_elements(weights).encode()
    (Path(td)/"actual.cii").write_bytes(data)
    ledger["output"]["ciiSha256"]=sha(data)
    lineage={"schemaVersion":G5.SCHEMA,"basisId":OLD.BASIS,
        "ciiSha256":sha(data),"nativeCiiReleaseAuthorized":False,
        "groups":[{"sourceId":"SRC1","componentOccurrenceId":"physical-480",
            "physicalComponentGroupId":"SRC1/physical-480",
            "branchOccurrenceIndex":0,"nodeOrdinal":0,
            "sourceNodeNumber":"-1","sourceComponentRefNo":"480",
            "sourceEndpoint":"","sourceBranchName":"SAME",
            "children":[{"rigidRecordIndex":i,"nativeElementIndex":i,
                "ciiFromNode":100+10*i,"ciiToNode":110+10*i}
                for i in range(len(weights))]}],
        "nonmassRigid":[]}
    return ledger,lineage

def must_fail(fn,code):
    try:fn()
    except (G5.LineageError,G5.MASS.MassOracleError) as exc:
        assert exc.code==code, f"Expected {code}, got {exc.code}"
        return
    raise AssertionError("Missing expected hold "+code)

class NativeElementLineageTests(unittest.TestCase):
    def verify(self,ledger,lineage,td):
        return G5.verify_lineage(ledger,lineage,
            (Path(td)/"actual.cii").read_bytes(),td,td)

    def test_split_child_real_cii_pointer_and_mass_lineage_challenged_only(self):
        with tempfile.TemporaryDirectory() as td:
            ledger,lineage=fixture(td)
            result=self.verify(ledger,lineage,td)
            self.assertEqual(result["ciiElements"],2)
            self.assertEqual(result["ciiRigidRecords"],2)
            self.assertEqual(result["status"],
                             "ELEMENT_POINTER_AND_CLAIMED_LINEAGE_CHALLENGED")
            self.assertFalse(result["nativeCiiReleaseAuthorized"])
            self.assertFalse(result["physicalMatch2ConsumptionVerified"])
            self.assertFalse(result["independentLineageAuthorVerified"])

    def test_changed_native_endpoint_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            ledger,lineage=fixture(td)
            lineage["groups"][0]["children"][0]["ciiToNode"]=999
            must_fail(lambda:self.verify(ledger,lineage,td),
                      "LINEAGE_NATIVE_ENDPOINT_DRIFT")

    def test_swapped_pointer_rejected_even_when_rigid_masses_match(self):
        with tempfile.TemporaryDirectory() as td:
            ledger,lineage=fixture(td)
            data=cii_with_elements(["600","607.34"],[2,1]).encode()
            (Path(td)/"actual.cii").write_bytes(data)
            ledger["output"]["ciiSha256"]=sha(data)
            lineage["ciiSha256"]=sha(data)
            must_fail(lambda:self.verify(ledger,lineage,td),
                      "LINEAGE_RIGID_ELEMENT_POINTER_DRIFT")

    def test_duplicate_or_orphan_pointer_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            ledger,lineage=fixture(td)
            for pointers,code in [([1,1],"DUPLICATE_CII_RIGID_POINTER"),
                                  ([1,0],"UNREFERENCED_CII_RIGID_RECORD")]:
                data=cii_with_elements(["600","607.34"],pointers).encode()
                (Path(td)/"actual.cii").write_bytes(data)
                ledger["output"]["ciiSha256"]=sha(data)
                lineage["ciiSha256"]=sha(data)
                must_fail(lambda:self.verify(ledger,lineage,td),code)

    def test_original_ordinal_and_reference_checked_from_original_source(self):
        with tempfile.TemporaryDirectory() as td:
            ledger,lineage=fixture(td)
            lineage["groups"][0]["nodeOrdinal"]=1
            must_fail(lambda:self.verify(ledger,lineage,td),
                      "LINEAGE_ORIGINAL_PHYSICAL_DRIFT")
            lineage["groups"][0]["nodeOrdinal"]=0
            lineage["groups"][0]["sourceComponentRefNo"]="481"
            must_fail(lambda:self.verify(ledger,lineage,td),
                      "LINEAGE_ORIGINAL_PHYSICAL_DRIFT")

    def test_forged_release_output_sha_and_missing_child_denied(self):
        with tempfile.TemporaryDirectory() as td:
            ledger,lineage=fixture(td)
            lineage["nativeCiiReleaseAuthorized"]=True
            must_fail(lambda:self.verify(ledger,lineage,td),
                      "LINEAGE_CLAIMED_RELEASE_AUTHORITY")
            lineage["nativeCiiReleaseAuthorized"]=False
            lineage["ciiSha256"]="0"*64
            must_fail(lambda:self.verify(ledger,lineage,td),
                      "LINEAGE_CII_SHA_DRIFT")
            lineage["ciiSha256"]=ledger["output"]["ciiSha256"]
            lineage["groups"][0]["children"]=lineage["groups"][0]["children"][:1]
            must_fail(lambda:self.verify(ledger,lineage,td),
                      "LINEAGE_CHILD_ALLOCATIONS_DRIFT")

    def test_bad_element_count_and_wrong_accepted_mass_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            ledger,lineage=fixture(td)
            body=(Path(td)/"actual.cii").read_text().replace(
                "2 0 0 0 0 0\n0 2","1 0 0 0 0 0\n0 2")
            data=body.encode()
            (Path(td)/"actual.cii").write_bytes(data)
            ledger["output"]["ciiSha256"]=sha(data)
            lineage["ciiSha256"]=sha(data)
            must_fail(lambda:self.verify(ledger,lineage,td),
                      "CII_ELEMENTS_COUNT_MISMATCH")
            ledger,lineage=fixture(td)
            ledger["groups"][0]["acceptedKg"]="15"
            must_fail(lambda:self.verify(ledger,lineage,td),
                      "ACCEPTED_MASS_MISMATCH")

    def test_file_cli_invocation_requires_same_actual_cii(self):
        with tempfile.TemporaryDirectory() as td:
            ledger,lineage=fixture(td,split=False)
            (Path(td)/"ledger.json").write_text(json.dumps(ledger))
            (Path(td)/"lineage.json").write_text(json.dumps(lineage))
            result=G5.run_files(Path(td)/"ledger.json",Path(td)/"actual.cii",
                                Path(td)/"lineage.json",td,td)
            self.assertEqual(result["physicalGroups"],1)
            self.assertFalse(result["nativeCiiReleaseAuthorized"])


INV=load("native_owner_inventory",ROOT/"scripts/xml229-native-mass-owner-inventory.py")


class NativeMassOwnerInventoryTests(unittest.TestCase):
    """No fabricated Final approvals; exercise *only* R2 evidence anatomy."""

    def case(self, td, *, flange_case="original"):
        import subprocess
        import sys
        from xml.etree import ElementTree as ET
        root=Path(td)
        if flange_case == "original":
            kinds=[("RIGID","2","35"),("VALV","","45"),
                   ("INST","","50"),("FLAN","","70")]
        else:
            assert flange_case in ("matched", "mismatched")
            kinds=[("RIGID","2","35"),("FLAN","","70"),
                   ("VALV","","45"),("INST","","50")]
        nodes=[
            "<Node><NodeNumber>10</NodeNumber><Position>0 0 0</Position>"
            "<ComponentType>BRAN</ComponentType><ComponentRefNo>PUBLIC/0</ComponentRefNo>"
            "<Weight>0</Weight><OutsideDiameter>610</OutsideDiameter></Node>"
        ]
        for i,(kind,rigid,mass) in enumerate(kinds):
            component_ref=(
                "PUBLIC/1" if kind=="FLAN" and flange_case=="matched"
                else ("PUBLIC/WRONG" if kind=="FLAN" and flange_case=="mismatched"
                      else f"PUBLIC/{i+1}")
            )
            nodes.append(
                f"<Node><NodeNumber>{20+i*10}</NodeNumber>"
                f"<Position>{(i+1)*200} 0 0</Position>"
                f"<ComponentType>{kind}</ComponentType>"
                f"<ComponentRefNo>{component_ref}</ComponentRefNo>"
                f"<Endpoint>2</Endpoint><Rigid>{rigid}</Rigid>"
                f"<Weight>{mass}</Weight><OutsideDiameter>610</OutsideDiameter></Node>"
            )
        xml=("<PipeStressExport xmlns='http://aveva.com/pipeStress116.xsd'>"
             "<Pipe><Branch><Branchname>/PUBLIC-NATIVE-OWNERS/B1</Branchname>"
             + "".join(nodes) + "</Branch></Pipe></PipeStressExport>").encode()
        (root/"engine.xml").write_bytes(xml)
        cii=root/"output.cii"
        native=ROOT/"converters/scripts/xml_to_cii2019_runtime_custody.py"
        result=subprocess.run(
            [sys.executable,str(native),"--input",str(root/"engine.xml"),
             "--output",str(cii),"--weight-scale","10"],
            capture_output=True,text=True,timeout=30)
        self.assertEqual(result.returncode,0,result.stderr[-1300:])
        cii_bytes=cii.read_bytes()
        node_list=[n for n in ET.fromstring(xml).iter()
                   if n.tag.rsplit("}",1)[-1]=="Node"]
        matches=[]
        for ordinal in range(1,5):
            node=node_list[ordinal]
            val=lambda name: next((e.text or "" for e in node
                   if e.tag.rsplit("}",1)[-1]==name),"").strip()
            signature=f"public-frozen-{ordinal}"
            matches.append({
                "originalOccurrenceId":json.dumps(
                    ["PUBLIC",0,ordinal,signature],separators=(",",":")),
                "sourceId":"PUBLIC","branchOccurrenceIndex":0,
                "originalNodeOrdinal":ordinal,"engineNodeOrdinal":ordinal,
                "componentSignature":signature,
                "branchName":"/PUBLIC-NATIVE-OWNERS/B1",
                "engineNodeNumber":val("NodeNumber"),
                "enginePosition":val("Position"),
                "componentType":val("ComponentType"),
                "componentRefNo":val("ComponentRefNo"),
                "endpoint":val("Endpoint"),"nodeName":val("NodeName"),
                "rigid":val("Rigid"),"engineWeightKg":float(val("Weight"))
            })
        transfer={
            "schema":"XML229.R2.OriginalPhysicalEngineInputTransfer.v1",
            "basisId":"a"*64,"finalIntentSha256":"b"*64,
            "originalJsonSha256":"c"*64,"engineInputSha256":sha(xml),
            "complete":True,"status":"ENGINE_INPUT_MASS_TRANSFER_VERIFIED_ONLY",
            "mappingKind":"STRICT_EXACT_PRE_SPLIT",
            "originalPhysicalCount":4,"verifiedEnginePhysicalCount":4,
            "nativeCiiPhysicalSlotVerified":False,
            "nativeCiiReleaseAuthorized":False,
            "matches":matches
        }
        return transfer,xml,cii_bytes

    def evaluate(self,transfer,xml,cii):
        return INV.inventory(transfer,xml,cii,weight_scale="10",
                             expected_cii_sha256=sha(cii))

    def rejected(self,code,fn):
        with self.assertRaises(INV.InventoryError) as raised:
            fn()
        self.assertEqual(raised.exception.code,code)

    def test_native_inventory_all_component_types_does_not_authorize_any_slot(self):
        with tempfile.TemporaryDirectory() as td:
            transfer,xml,cii=self.case(td)
            report=self.evaluate(transfer,xml,cii)
            self.assertEqual(report["sourcePhysicalCount"],4)
            self.assertEqual(report["sourceApprovedEngineKg"],"200")
            self.assertEqual(report["nativeRigidCount"],1)
            self.assertEqual(report["nativeRigidPointerCount"],1)
            self.assertEqual(float(report["nativeRigidOutputForce"]),350.0)
            self.assertEqual(float(report["nativeRigidEquivalentKgUnderClaimedScale"]),35.0)
            for kind in ("RIGID","VALV","INST","FLAN"):
                self.assertEqual(report["byComponentType"][kind]["positivePhysicals"],1)
            self.assertEqual(report["byComponentType"]["RIGID"]["explicitRigid2"],1)
            self.assertEqual(report["nativeOwnerRuleRequiredCount"],3)
            self.assertEqual(report["unresolvedPositiveNativeOwnerKg"],"165")
            self.assertEqual(report["explicitRigid2SourceKg"],"35")
            self.assertEqual(float(report["nativeAggregateDifferenceKgUnderClaimedScale"]),165)
            self.assertEqual(report["unresolvedOwnerRuleStatus"],
                             "BLOCKED_MISSING_NATIVE_OWNER_RULE")
            self.assertTrue(report["aggregateBalanceIsNotLineageProof"])
            for kind,expected in (("RIGID",0),("VALV",45),("INST",50),("FLAN",70)):
                self.assertEqual(float(
                  report["byComponentType"][kind]["needsNativeOwnerRuleKg"]),expected)
            self.assertFalse(report["nativeCiiPhysicalSlotVerified"])
            self.assertFalse(report["physicalMatch2ConsumptionVerified"])
            self.assertFalse(report["nativeCiiReleaseAuthorized"])
            self.assertEqual(report["coverageStatus"],
                "NATIVE_ORIGINAL_OCCURRENCE_TO_OUTPUT_UNVERIFIED")
            self.assertNotIn("matches",report)
            self.assertNotIn("originalOccurrenceIds",report)

    def test_same_ref_rigid_to_flan_uses_flange_mass_not_upstream_mass(self):
        """Exercise existing native edge classification and real emitted CII."""
        with tempfile.TemporaryDirectory() as td:
            transfer,xml,cii=self.case(td,flange_case="matched")
            report=self.evaluate(transfer,xml,cii)
            self.assertEqual(report["sourcePhysicalCount"],4)
            self.assertEqual(report["nativeRigidCount"],2)
            self.assertEqual(report["nativeRigidPointerCount"],2)
            self.assertEqual(float(report["nativeRigidOutputForce"]),1050)
            slots=G5.sections_from_output(cii.decode("utf-8"))["RIGID"]
            self.assertEqual([float(r.split()[0]) for r in slots],[350,700],
                "native RIGID slot 2 must use FLAN's 70kg, not RIGID's 35kg")
            elements,by_slot=G5.parse_elements(cii.decode("utf-8"))
            self.assertEqual({elements[edge_index][1]:slot
                              for slot,edge_index in by_slot.items()},
                             {20:0,30:1},
                "independent output ELEMENTS pointers must land at exact native node owners")
            self.assertEqual(report["sameRefRigidToFlanCandidateKg"],"70")
            self.assertEqual(report["preConversionRigidEdgeCandidateKg"],"105")
            self.assertEqual(report["unresolvedPositiveNativeOwnerKg"],"95")
            flange=report["byComponentType"]["FLAN"]
            self.assertEqual(flange["explicitRigid2"],0)
            self.assertEqual(flange["sameRefRigidToFlanCandidates"],1)
            self.assertEqual(flange["needsNativeOwnerRule"],0)
            self.assertFalse(report["physicalMatch2ConsumptionVerified"])
            self.assertFalse(report["nativeCiiReleaseAuthorized"])

    def test_branch_start_rigid2_marker_is_not_an_incoming_edge(self):
        from xml.etree import ElementTree as ET
        nodes=ET.fromstring(
            "<Branch>"
            "<Node><ComponentType>RIGID</ComponentType><Rigid>2</Rigid>"
            "<ComponentRefNo>PUBLIC/SAME</ComponentRefNo><Weight>35</Weight></Node>"
            "<Node><ComponentType>FLAN</ComponentType>"
            "<ComponentRefNo>PUBLIC/SAME</ComponentRefNo><Weight>70</Weight></Node>"
            "</Branch>"
        )
        self.assertEqual(INV.incoming_rigid_candidate(list(nodes),0),
                         "NO_KNOWN_NATIVE_RIGID_EDGE")
        self.assertEqual(INV.incoming_rigid_candidate(list(nodes),1),
                         "SAME_REF_RIGID_TO_FLAN")
        self.assertEqual(INV.field(nodes[1],"Weight"),"70")
        # Qualifying a flange edge must never borrow the prior 35kg.
        self.assertFalse(INV.incoming_rigid_candidate(list(nodes),0)
                         == "DIRECT_RIGID2")

    def test_immediately_adjacent_but_mismatched_flange_ref_is_not_owner(self):
        with tempfile.TemporaryDirectory() as td:
            transfer,xml,cii=self.case(td,flange_case="mismatched")
            report=self.evaluate(transfer,xml,cii)
            self.assertEqual(report["nativeRigidCount"],1)
            self.assertEqual(report["sameRefRigidToFlanCandidateKg"],"0")
            self.assertEqual(report["unresolvedPositiveNativeOwnerKg"],"165")
            self.assertEqual(report["byComponentType"]["FLAN"]["needsNativeOwnerRule"],1)
            self.assertFalse(report["nativeCiiPhysicalSlotVerified"])

    def test_hash_owners_manual_mass_and_status_guards_are_fail_closed(self):
        with tempfile.TemporaryDirectory() as td:
            transfer,xml,cii=self.case(td)
            self.rejected("ENGINE_INPUT_SHA_DRIFT",lambda:
                self.evaluate(transfer,xml.replace(b">45<",b">46<"),cii))
            wrong=json.loads(json.dumps(transfer))
            wrong["matches"][0]["engineWeightKg"]=36
            self.rejected("R2_ENGINE_MASS_DRIFT",lambda:self.evaluate(wrong,xml,cii))
            wrong=json.loads(json.dumps(transfer))
            wrong["matches"][1]["originalOccurrenceId"]=wrong["matches"][0]["originalOccurrenceId"]
            self.rejected("R2_ORIGINAL_OCCURRENCE_INVALID",lambda:
                self.evaluate(wrong,xml,cii))
            wrong=json.loads(json.dumps(transfer))
            wrong["matches"][1]["engineNodeOrdinal"]=1
            self.rejected("R2_DUPLICATE_PHYSICAL_OWNER",lambda:
                self.evaluate(wrong,xml,cii))
            wrong=json.loads(json.dumps(transfer))
            wrong["nativeCiiReleaseAuthorized"]=True
            self.rejected("TRANSFER_RELEASE_OR_COMPLETENESS_INVALID",lambda:
                self.evaluate(wrong,xml,cii))
            wrong=json.loads(json.dumps(transfer))
            wrong["verifiedEnginePhysicalCount"]=3
            self.rejected("R2_PHYSICAL_CENSUS_DRIFT",lambda:
                self.evaluate(wrong,xml,cii))
            self.rejected("CII_SHA_DRIFT",lambda:
                INV.inventory(transfer,xml,cii,weight_scale="10",
                    expected_cii_sha256="0"*64))
            self.rejected("MASS_OR_SCALE_INVALID",lambda:
                INV.inventory(transfer,xml,cii,weight_scale="NaN",
                    expected_cii_sha256=sha(cii)))

    def test_owner_private_inventory_cli_emits_aggregate_not_owner_rows(self):
        import subprocess
        import sys
        with tempfile.TemporaryDirectory() as td:
            transfer,xml,cii=self.case(td)
            root=Path(td)
            (root/"r2.json").write_text(json.dumps(transfer),encoding="utf-8")
            (root/"engine.xml").write_bytes(xml)
            (root/"native.cii").write_bytes(cii)
            output=root/"owner-local-PRIVATE-inventory.json"
            result=subprocess.run([
                sys.executable,str(ROOT/"scripts/xml229-native-mass-owner-inventory.py"),
                "--r2-transfer",str(root/"r2.json"),
                "--engine-xml",str(root/"engine.xml"),
                "--cii",str(root/"native.cii"),
                "--weight-scale","10","--expected-cii-sha256",sha(cii),
                "--output",str(output),
            ],capture_output=True,text=True,timeout=30)
            self.assertEqual(result.returncode,0,result.stderr[-1000:])
            summary=json.loads(output.read_text())
            self.assertEqual(summary["nativeOwnerRuleRequiredCount"],3)
            self.assertEqual(summary["sourcePhysicalCount"],4)
            self.assertFalse(summary["nativeCiiReleaseAuthorized"])
            self.assertIn("output private",result.stdout)
            self.assertNotIn("PUBLIC/1",output.read_text())
            self.assertNotIn("originalOccurrenceId",output.read_text())
            self.assertNotIn("PUBLIC-NATIVE-OWNERS",result.stdout)

    def test_balanced_output_aggregate_cannot_launder_owner_mismatch(self):
        with tempfile.TemporaryDirectory() as td:
            transfer,xml,cii=self.case(td)
            # A single forged 2000-unit RIGID would numerically match all
            # 200 kg in original XML under scale 10, but VALV/INST/FLAN
            # still have no reviewed native mapping to that rigid pointer.
            self.assertIn(b"350.000",cii)
            forged=cii.replace(b"350.000",b"2000.000")
            report=self.evaluate(transfer,xml,forged)
            self.assertEqual(float(report["nativeAggregateDifferenceKgUnderClaimedScale"]),0)
            self.assertEqual(report["unresolvedPositiveNativeOwnerKg"],"165")
            self.assertTrue(report["aggregateBalanceIsNotLineageProof"])
            self.assertEqual(report["coverageStatus"],
                             "NATIVE_ORIGINAL_OCCURRENCE_TO_OUTPUT_UNVERIFIED")
            self.assertFalse(report["physicalMatch2ConsumptionVerified"])
            self.assertFalse(report["nativeCiiReleaseAuthorized"])

    def test_strict_owner_guard_denies_without_emitting_private_output(self):
        import subprocess
        import sys
        with tempfile.TemporaryDirectory() as td:
            transfer,xml,cii=self.case(td)
            root=Path(td)
            (root/"r2.json").write_text(json.dumps(transfer))
            (root/"engine.xml").write_bytes(xml)
            (root/"native.cii").write_bytes(cii)
            report=root/"strict-inventory.json"
            result=subprocess.run([
                sys.executable,str(ROOT/"scripts/xml229-native-mass-owner-inventory.py"),
                "--r2-transfer",str(root/"r2.json"),"--engine-xml",str(root/"engine.xml"),
                "--cii",str(root/"native.cii"),"--weight-scale","10",
                "--expected-cii-sha256",sha(cii),"--deny-unresolved-mass",
                "--output",str(report)
            ],capture_output=True,text=True,timeout=30)
            self.assertNotEqual(result.returncode,0)
            self.assertIn("NATIVE_OWNER_RULE_UNRESOLVED",result.stderr)
            self.assertFalse(report.exists())
            self.assertNotIn("PUBLIC/1",result.stdout)
            self.assertNotIn("PUBLIC-NATIVE-OWNERS",result.stderr)

    def fixture_claims(self,transfer,cii,*,flange=False):
        # Independent synthetic expected endpoints: not copied from emitted
        # CII ELEMENTS or the inventory's suggested candidate classifications.
        rows=[]
        for i,source in enumerate(transfer["matches"]):
            claimed=(
                (i==0) or (flange and i==1))
            if claimed:
                rows.append({
                  "originalOccurrenceId":source["originalOccurrenceId"],
                  "status":"CII_RIGID_CANDIDATE",
                  "rigidRecordIndex":i,"nativeElementIndex":i,
                  "ciiFromNode":10 if i==0 else 20,
                  "ciiToNode":20 if i==0 else 30,
                })
            else:
                rows.append({
                  "originalOccurrenceId":source["originalOccurrenceId"],
                  "status":"UNRESOLVED",
                  "reason":"Class-specific owner policy and retained edge not independently approved",
                })
        return {
          "schema":"XML229.NativeMassOwnerProvisionalClaims.v1",
          "nativeCiiReleaseAuthorized":False,
          "basisId":transfer["basisId"],
          "finalIntentSha256":transfer["finalIntentSha256"],
          "engineInputSha256":transfer["engineInputSha256"],
          "ciiSha256":sha(cii),
          "rows":rows,
        }

    def test_provisional_claims_challenge_exact_actual_cii_slots_but_never_release(self):
        with tempfile.TemporaryDirectory() as td:
            transfer,xml,cii=self.case(td,flange_case="matched")
            claims=self.fixture_claims(transfer,cii,flange=True)
            result=INV.challenge_provisional_native_slots(
                transfer,xml,cii,claims,weight_scale="10",
                expected_cii_sha256=sha(cii))
            self.assertEqual(result["oneToOneNativeCandidateCount"],2)
            self.assertEqual(float(result["oneToOneNativeCandidateKg"]),105)
            self.assertEqual(result["unresolvedPhysicalCount"],2)
            self.assertEqual(float(result["unresolvedPhysicalKg"]),95)
            self.assertEqual(result["unassignedZeroNativeRigidSlots"],0)
            self.assertFalse(result["verifiedClaimAuthor"])
            self.assertFalse(result["independentSourceLineageVerified"])
            self.assertFalse(result["physicalMatch2ConsumptionVerified"])
            self.assertFalse(result["nativeCiiPhysicalSlotVerified"])
            self.assertFalse(result["nativeCiiReleaseAuthorized"])
            self.assertNotIn("originalOccurrenceId",json.dumps(result))
        with tempfile.TemporaryDirectory() as td:
            transfer,xml,cii=self.case(td,flange_case="mismatched")
            claims=self.fixture_claims(transfer,cii)
            result=INV.challenge_provisional_native_slots(
                transfer,xml,cii,claims,weight_scale="10",
                expected_cii_sha256=sha(cii))
            self.assertEqual(result["oneToOneNativeCandidateCount"],1)
            self.assertEqual(float(result["unresolvedPhysicalKg"]),165)
            self.assertFalse(result["nativeCiiReleaseAuthorized"])

    def test_provisional_slot_claims_reject_unreviewed_laundered_owners(self):
        with tempfile.TemporaryDirectory() as td:
            transfer,xml,cii=self.case(td,flange_case="matched")
            base=self.fixture_claims(transfer,cii,flange=True)
            import copy
            def deny(code,claims,output=cii):
                self.rejected(code,lambda:INV.challenge_provisional_native_slots(
                    transfer,xml,output,claims,weight_scale="10",
                    expected_cii_sha256=sha(output)))
            claim=copy.deepcopy(base)
            claim["nativeCiiReleaseAuthorized"]=True
            deny("PROVISIONAL_LINEAGE_BASIS_OR_AUTHORITY_DRIFT",claim)
            claim=copy.deepcopy(base)
            claim["basisId"]="f"*64
            deny("PROVISIONAL_LINEAGE_BASIS_OR_AUTHORITY_DRIFT",claim)
            claim=copy.deepcopy(base)
            claim["rows"].pop()
            deny("PROVISIONAL_LINEAGE_POPULATION_DRIFT",claim)
            claim=copy.deepcopy(base)
            claim["rows"][2]["originalOccurrenceId"]=claim["rows"][1]["originalOccurrenceId"]
            deny("PROVISIONAL_LINEAGE_ORIGINAL_DRIFT",claim)
            claim=copy.deepcopy(base)
            claim["rows"][2]={
              "originalOccurrenceId":transfer["matches"][2]["originalOccurrenceId"],
              "status":"CII_RIGID_CANDIDATE",
              "rigidRecordIndex":0,"nativeElementIndex":0,
              "ciiFromNode":10,"ciiToNode":20,
            }
            deny("PROVISIONAL_NATIVE_CLASS_RULE_UNVERIFIED",claim)
            claim=copy.deepcopy(base)
            claim["rows"][1]["rigidRecordIndex"]=0
            deny("PROVISIONAL_NATIVE_SLOT_DUPLICATE_OR_RANGE",claim)
            claim=copy.deepcopy(base)
            claim["rows"][1]["nativeElementIndex"]=0
            deny("PROVISIONAL_NATIVE_SLOT_DUPLICATE_OR_RANGE",claim)
            claim=copy.deepcopy(base)
            claim["rows"][1]["nativeElementIndex"]=2
            deny("PROVISIONAL_NATIVE_RIGID_POINTER_DRIFT",claim)
            claim=copy.deepcopy(base)
            claim["rows"][1]["ciiToNode"]=99
            deny("PROVISIONAL_NATIVE_ELEMENT_ENDPOINT_DRIFT",claim)
            claim=copy.deepcopy(base)
            claim["rows"][2]["nativeElementIndex"]=2
            deny("PROVISIONAL_UNRESOLVED_WITH_SLOT",claim)
            claim=copy.deepcopy(base)
            claim["rows"][1]={"originalOccurrenceId":transfer["matches"][1]["originalOccurrenceId"],
                              "status":"UNRESOLVED","reason":"Not independently verified"}
            deny("PROVISIONAL_UNACCOUNTED_POSITIVE_RIGID",claim)
            self.assertIn(b"700.000",cii)
            forged=cii.replace(b"700.000",b"750.000")
            claim=copy.deepcopy(base)
            claim["ciiSha256"]=sha(forged)
            deny("PROVISIONAL_NATIVE_RIGID_MASS_DRIFT",claim,forged)

    def test_provisional_claim_cli_writes_aggregate_only_and_stays_held(self):
        import subprocess
        import sys
        with tempfile.TemporaryDirectory() as td:
            transfer,xml,cii=self.case(td,flange_case="matched")
            claims=self.fixture_claims(transfer,cii,flange=True)
            root=Path(td)
            (root/"r2.json").write_text(json.dumps(transfer))
            (root/"engine.xml").write_bytes(xml)
            (root/"out.cii").write_bytes(cii)
            (root/"claims-private.json").write_text(json.dumps(claims))
            private=root/"result-private.json"
            run=subprocess.run([
              sys.executable,str(ROOT/"scripts/xml229-native-mass-owner-inventory.py"),
              "--r2-transfer",str(root/"r2.json"),
              "--engine-xml",str(root/"engine.xml"),"--cii",str(root/"out.cii"),
              "--weight-scale","10","--expected-cii-sha256",sha(cii),
              "--provisional-lineage-claims",str(root/"claims-private.json"),
              "--output",str(private)
            ],capture_output=True,text=True,timeout=30)
            self.assertEqual(run.returncode,0,run.stderr[-1000:])
            report=json.loads(private.read_text())
            self.assertEqual(report["provisionalNativeChallenge"]["oneToOneNativeCandidateCount"],2)
            self.assertFalse(report["nativeCiiReleaseAuthorized"])
            self.assertFalse(report["provisionalNativeChallenge"]["nativeCiiReleaseAuthorized"])
            self.assertNotIn("originalOccurrenceId",private.read_text())
            self.assertNotIn("PUBLIC/1",private.read_text())
            self.assertNotIn("PUBLIC-NATIVE-OWNERS",run.stdout)

    def observed_case(self, td, *, flange_case="matched"):
        import subprocess
        import sys
        transfer,xml,cii=self.case(td,flange_case=flange_case)
        root=Path(td)
        witness=root/"private-retained-edges.json"
        native_output=root/"model-emitted.cii"
        result=subprocess.run([
            sys.executable,str(ROOT/"scripts/xml229-native-retained-edge-observer.py"),
            "--engine-xml",str(root/"engine.xml"),
            "--cii-out",str(native_output),
            "--private-witness-out",str(witness),
            "--weight-scale","10",
        ],capture_output=True,text=True,timeout=40)
        self.assertEqual(result.returncode,0,result.stderr[-1800:])
        self.assertEqual(native_output.read_bytes(),cii,
            "Passive observer must call exactly the unchanged production runtime")
        captured=json.loads(witness.read_text())
        self.assertEqual(captured["ciiSha256"],sha(cii))
        self.assertEqual(captured["engineInputSha256"],sha(xml))
        self.assertNotIn("PUBLIC/1",result.stdout)
        self.assertNotIn("PUBLIC/1",result.stderr)
        return transfer,xml,cii,captured

    def verify_observed(self,transfer,xml,cii,witness):
        return INV.challenge_retained_native_edges(
            transfer,xml,cii,witness,weight_scale="10",
            expected_cii_sha256=sha(cii))

    def test_real_native_runtime_retained_edges_bind_to_actual_rigid_slots(self):
        with tempfile.TemporaryDirectory() as td:
            transfer,xml,cii,witness=self.observed_case(td,flange_case="matched")
            result=self.verify_observed(transfer,xml,cii,witness)
            self.assertEqual(result["sourcePhysicalCount"],4)
            self.assertEqual(result["sourcePhysicalsWithUniqueRetainedArrival"],4)
            self.assertEqual(result["nativePositiveRigidOwnersBoundToR2"],2)
            self.assertEqual(float(result["nativePositiveRigidKgBoundToR2"]),105)
            self.assertEqual(float(result["unrepresentedOriginalKg"]),95)
            self.assertEqual(result["nativeRigidCount"],2)
            self.assertFalse(result["independentRuntimeAuthorVerified"])
            self.assertFalse(result["nativeCiiPhysicalSlotVerified"])
            self.assertFalse(result["physicalMatch2ConsumptionVerified"])
            self.assertFalse(result["nativeCiiReleaseAuthorized"])
            self.assertNotIn("originalOccurrenceId",json.dumps(result))
        with tempfile.TemporaryDirectory() as td:
            transfer,xml,cii,witness=self.observed_case(td,flange_case="mismatched")
            result=self.verify_observed(transfer,xml,cii,witness)
            self.assertEqual(result["nativePositiveRigidOwnersBoundToR2"],1)
            self.assertEqual(float(result["nativePositiveRigidKgBoundToR2"]),35)
            self.assertEqual(float(result["unrepresentedOriginalKg"]),165)

    def test_model_observation_rejects_source_swaps_and_output_drift(self):
        import copy
        with tempfile.TemporaryDirectory() as td:
            transfer,xml,cii,witness=self.observed_case(td,flange_case="matched")
            def deny(code,w):
                self.rejected(code,lambda:self.verify_observed(transfer,xml,cii,w))
            changed=copy.deepcopy(witness)
            changed["ciiSha256"]="f"*64
            deny("RETAINED_OBSERVATION_CUSTODY_DRIFT",changed)
            changed=copy.deepcopy(witness)
            changed["edges"][0]["ciiToNode"]=999
            deny("RETAINED_EDGE_TO_OUTPUT_DRIFT",changed)
            changed=copy.deepcopy(witness)
            changed["edges"][0]["rigidRecordIndex"]=1
            deny("RETAINED_EDGE_TO_OUTPUT_DRIFT",changed)
            changed=copy.deepcopy(witness)
            changed["edges"][0]["to"]["weightKg"]="36"
            deny("RETAINED_EDGE_MASS_DRIFT",changed)
            changed=copy.deepcopy(witness)
            changed["edges"][0]["to"]["sourceNodeNumber"]=999
            deny("RETAINED_POSITIVE_RIGID_WITHOUT_R2_OWNER",changed)
            changed=copy.deepcopy(witness)
            changed["edges"][0]["to"]["componentRefNo"]="PUBLIC/FOREIGN"
            deny("RETAINED_POSITIVE_RIGID_WITHOUT_R2_OWNER",changed)
            changed=copy.deepcopy(witness)
            changed["edges"][0]["to"]["position"]=["201","0","0"]
            deny("RETAINED_POSITIVE_RIGID_WITHOUT_R2_OWNER",changed)
            changed=copy.deepcopy(witness)
            changed["edges"].pop()
            deny("RETAINED_EDGE_POPULATION_DRIFT",changed)

    def test_retained_observation_owner_local_cli_uses_only_aggregates(self):
        import subprocess
        import sys
        with tempfile.TemporaryDirectory() as td:
            transfer,xml,cii,witness=self.observed_case(td,flange_case="matched")
            root=Path(td)
            (root/"r2.json").write_text(json.dumps(transfer))
            private=root/"inventory-with-retained.json"
            cli=subprocess.run([
              sys.executable,str(ROOT/"scripts/xml229-native-mass-owner-inventory.py"),
              "--r2-transfer",str(root/"r2.json"),
              "--engine-xml",str(root/"engine.xml"),
              "--cii",str(root/"model-emitted.cii"),
              "--weight-scale","10","--expected-cii-sha256",sha(cii),
              "--private-retained-edge-observation",str(root/"private-retained-edges.json"),
              "--output",str(private),
            ],capture_output=True,text=True,timeout=30)
            self.assertEqual(cli.returncode,0,cli.stderr[-1800:])
            output=private.read_text()
            report=json.loads(output)["retainedEdgeChallenge"]
            self.assertEqual(report["nativePositiveRigidOwnersBoundToR2"],2)
            self.assertFalse(report["nativeCiiReleaseAuthorized"])
            self.assertNotIn("originalOccurrenceId",output)
            self.assertNotIn("PUBLIC/1",output)
            self.assertNotIn("PUBLIC-NATIVE-OWNERS",cli.stdout)

    def test_native_cii_units_and_slot_count_witness_are_fail_closed(self):
        with tempfile.TemporaryDirectory() as td:
            transfer,xml,cii=self.case(td)
            tampered=cii.replace(b"  N. ",b"  lbf. ")
            self.assertNotEqual(tampered,cii)
            self.rejected("CII_FORCE_UNIT_UNVERIFIED",lambda:
                self.evaluate(transfer,xml,tampered))
            altered=cii.replace(b"#$ RIGID\n",b"#$ RIGID\n"
                                +b"  0.000000     0.000000\n")
            self.assertNotEqual(altered,cii)
            self.rejected("NATIVE_CII_STRUCTURE_INVALID",lambda:
                self.evaluate(transfer,xml,altered))

if __name__=="__main__":
    unittest.main()
