"""R2-C2: independent native RIGID slot observation; NEVER CII release."""
from pathlib import Path
from types import SimpleNamespace
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "converters" / "scripts"))
from xml_cii_r2_native_physical_slot_audit import (
    audit_original_rigid_native_slots, NativePhysicalSlotError,
)

BRANCH = "/OWNER-S8811000/B1"
def make_transfer(rigid="2"):
    return {
      "schema":"XML229.R2.OriginalPhysicalEngineInputTransfer.v1",
      "complete":True,"nativeCiiReleaseAuthorized":False,
      "basisId":"a"*64,"finalIntentSha256":"b"*64,
      "engineInputSha256":"c"*64,"originalPhysicalCount":1,
      "matches":[{
        "originalOccurrenceId":'["original",0,1,"RIGID"]',
        "sourceId":"original",
        "branchOccurrenceIndex":0,"originalNodeOrdinal":1,
        "engineNodeOrdinal":1,"branchName":BRANCH,
        "engineNodeNumber":"300","enginePosition":"112 0 0",
        "componentType":"RIGID","componentRefNo":"100/200",
        "endpoint":"2","nodeName":"","rigid":rigid,
        "engineWeightKg":35.0,
      }],
    }

def make_model(mass=35.0):
    node=SimpleNamespace(
      source_node_number=None,node_number=300,position=(112.,0.,0.),
      component_type="RIGID",component_ref_no="100/200",
      endpoint=2,node_name="",weight=mass,
    )
    return SimpleNamespace(rigid_edges=[
      SimpleNamespace(branch_name=BRANCH,to_node=node)])

def cii(weight=35.0):
    return "#$ VERSION\n#$ RIGID\n"+f"{weight:>15g}{0:>13.6f}"+"\n#$ EXPJT\n"

class R2C2Slots(unittest.TestCase):
    def test_one_original_rigid_matches_exact_native_cii_slot(self):
        data=audit_original_rigid_native_slots(make_transfer(),make_model(),cii())
        self.assertTrue(data["rigidOnlyVerified"])
        self.assertFalse(data["allPhysicalKindsVerified"])
        self.assertFalse(data["nativeCiiReleaseAuthorized"])
        self.assertEqual(data["verifiedOriginalRigidCount"],1)
        self.assertEqual(data["rigidSlots"][0]["rigidSlotOrdinal"],0)
        self.assertEqual(len(data["ciiOutputSha256"]),64)

    def test_weight_scale_is_applied_to_native_output_only(self):
        data=audit_original_rigid_native_slots(
          make_transfer(),make_model(),cii(343.233),weight_scale=9.80665)
        self.assertEqual(data["rigidSlots"][0]["approvedKg"],35.)

    def test_positive_engine_mass_mismatch_is_blocked(self):
        with self.assertRaisesRegex(NativePhysicalSlotError,"CII_RIGID_WEIGHT_DRIFT"):
            audit_original_rigid_native_slots(make_transfer(),make_model(),cii(40))

    def test_native_model_weight_drift_is_blocked(self):
        with self.assertRaisesRegex(NativePhysicalSlotError,"NATIVE_MODEL_WEIGHT_DRIFT"):
            audit_original_rigid_native_slots(make_transfer(),make_model(40),cii())

    def test_duplicate_native_to_node_owner_is_blocked(self):
        model=make_model()
        model.rigid_edges.append(model.rigid_edges[0])
        with self.assertRaisesRegex(NativePhysicalSlotError,"NATIVE_PHYSICAL_OWNER_NOT_UNIQUE"):
            audit_original_rigid_native_slots(make_transfer(),model,
                "#$ RIGID\n"+f"{35:>15g}{0:>13.6f}"+"\n"+
                  f"{35:>15g}{0:>13.6f}"+"\n#$ EXPJT\n")

    def test_wrong_or_missing_rigid_slot_count_fails(self):
        with self.assertRaisesRegex(NativePhysicalSlotError,"CII_RIGID_SLOT_CARDINALITY"):
            audit_original_rigid_native_slots(make_transfer(),make_model(),
              "#$ RIGID\n#$ EXPJT\n")

    def test_nonrigid_component_explicit_hold(self):
        with self.assertRaisesRegex(NativePhysicalSlotError,"UNSUPPORTED_NATIVE_WEIGHT_SECTION"):
            audit_original_rigid_native_slots(make_transfer(""),make_model(),cii())

    def test_legacy_row_or_unknown_identity_not_accepted(self):
        transfer=make_transfer()
        transfer["matches"][0]["enginePosition"]="112 0 999"
        with self.assertRaisesRegex(NativePhysicalSlotError,"NATIVE_PHYSICAL_OWNER_NOT_UNIQUE"):
            audit_original_rigid_native_slots(transfer,make_model(),cii())

    def test_spoofed_release_claim_refused(self):
        transfer=make_transfer();transfer["nativeCiiReleaseAuthorized"]=True
        with self.assertRaisesRegex(NativePhysicalSlotError,"FULL_SOURCE_TRANSFER_REQUIRED"):
            audit_original_rigid_native_slots(transfer,make_model(),cii())

if __name__=="__main__":
    unittest.main()
