"""Rigid S1 non-released Native Final test CII: original source -> staged binder -> actual writer.

This module is NEVER called by the application runtime or release reconciler.
Only a deliberately reduced checkpoint fixture is emitted; unresolved model
parts are NOT zero-filled. The original 687252-byte R9 XML stays in Drive.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import io
import json
import math
from pathlib import Path
from tempfile import TemporaryDirectory

import xml_to_cii2019 as native
import xml_to_cii2019_patched as patched
from xml229_native_final_mass_binding import (
    NativeMassError, assert_preaccepted_geometry_unchanged,
    audit_finalized_physical_endpoints, bind_native_final_xml,
    emitted_sections, _cii_elements, parse_bytes,
    s1_build_test_only_fixture, stage_native_original_lineage,
)
from xml_cii_weight_output_custody import require_rigid_weight_owners

R9_SHA256 = "5cf2bfbe4cbe88361afcb3374c5230ee4badf42d9f503ec2cb5b2f0b7414e00c"
# Exact default master entries at main 3377b7f4: index+1 = row 252, 974.
# These are frozen TEST reference cells, not a new authoritative production master.
MASTER_ROWS = (
    {"id": 252, "TypeDesc": "Weldneck Flange", "DN": 50, "Rating": 900,
     "length": 109, "RF/RTJ KG": 15},
    {"id": 974, "TypeDesc": "Flanged Ball Valve-Reduced Bore", "DN": 50,
     "Rating": 900, "length": 368, "RF/RTJ KG": 47},
)


def nonrelease_guard(receipt):
    """No review/suggestion is Owner-approved by merely being numeric."""
    if (receipt.get("nativeCiiReleaseAuthorized") is not False or
            receipt.get("schema") != "RigidS1.NonReleasePcomFlangeWitness.v1" or
            any(p.get("status") in ("REVIEW", "SUGGESTED") and
                p.get("ownerApproved") is not False
                for p in receipt.get("checkpoints", [])) or
            not receipt.get("checkpoints") or
            any(p.get("status") != "SUGGESTED"
                for p in receipt.get("checkpoints", []))):
        raise NativeMassError("S1_FINAL_RELEASE_BLOCKED")
    return False


def _emitted_force(cii, parsed_elements, pointer_slots, rigid_weights, fr, to):
    matched = [(i, entry) for i, entry in enumerate(parsed_elements)
               if int(float(entry[0])) == int(fr) and
                  int(float(entry[1])) == int(to)]
    if len(matched) != 1:
        raise NativeMassError("S1_ACTUAL_CII_ELEMENT_UNIQUE_MATCH")
    i, item = matched[0]
    pointer = item[2]
    if not pointer or pointer - 1 not in pointer_slots:
        raise NativeMassError("S1_ACTUAL_CII_RIGID_POINTER_MISSING")
    if pointer_slots[pointer - 1][0] != i:
        raise NativeMassError("S1_ACTUAL_CII_RIGID_POINTER_MISMATCH")
    return i, pointer, rigid_weights[pointer - 1]


def verify_actual_cii(cii, receipt):
    """Read back ACTUAL Python-written ELEMENTS row 13 field 2 -> RIGID bytes.

    Do not reuse an intended mass list to prove a CII mass. Never set
    nativeCiiReleaseAuthorized or splitGeometryIndependentlyVerified.
    """
    nonrelease_guard(receipt)
    slots, weights = emitted_sections(cii)
    elements = _cii_elements(cii)
    checkpoints = receipt["checkpoints"]
    if len(checkpoints) != 14 or len(elements) != 28 or len(slots) != 28:
        raise NativeMassError("S1_CII_PAIR_POPULATION_DRIFT")
    used = set()
    for check in checkpoints:
        c_idx, c_ptr, c_n = _emitted_force(
            cii, elements, slots, weights,
            check["connectionFrom"], check["connectionTo"])
        f_idx, f_ptr, f_n = _emitted_force(
            cii, elements, slots, weights,
            check["flangeFrom"], check["flangeTo"])
        if (c_idx == f_idx or c_ptr == f_ptr or
                c_idx in used or f_idx in used or
                c_n == 150 or c_n == f_n or
                not math.isclose(c_n, check["weightKg"] * 10, abs_tol=1e-6) or
                f_n != 150):
            raise NativeMassError("S1_CII_PCOM_FLANGE_FORCE_DRIFT")
        used.update((c_idx, f_idx))
        check.update({
            "actualTestCiiConnectionElementIndex": c_idx,
            "actualTestCiiConnectionRigidPointer": c_ptr,
            "actualTestCiiSuggestedForceN": c_n,
            "actualTestCiiFlangeElementIndex": f_idx,
            "actualTestCiiFlangeRigidPointer": f_ptr,
            "actualTestCiiFlangeForceN": f_n,
        })
    if len(used) != 28 or len(set(p["flangeRef"] for p in checkpoints)) != 14:
        raise NativeMassError("S1_CII_DOUBLE_PHYSICAL_OWNER")
    receipt["actualTestCiiSha256"] = hashlib.sha256(cii.encode("utf-8")).hexdigest()
    receipt["actualTestCiiRigidCount"] = len(weights)
    receipt["actualTestCiiElementCount"] = len(elements)
    receipt["actualCiiBytesChecked"] = True
    receipt["nonReleasedFixture"] = True
    receipt["nativeCiiReleaseAuthorized"] = False
    return receipt


def render_s1_nonrelease(source_bytes, *, master_rows=MASTER_ROWS):
    """Emit CII only within a scratch directory; no production packet or release."""
    fixture, packet, receipt = s1_build_test_only_fixture(source_bytes, master_rows)
    with TemporaryDirectory(prefix="rigid-s1-nonrelease-") as td:
        directory = Path(td)
        src = directory / "S1_DERIVED_TEST_ONLY_SOURCE.xml"
        src.write_bytes(fixture)
        packet_path = directory / "S1_TEST_ONLY_FINAL_STYLE_PACKET.json"
        packet_path.write_text(json.dumps(packet), encoding="utf-8")
        staged = stage_native_original_lineage(src, packet_path)
        # Existing real Native Final binding, not a synthetic mass allocator.
        bound, owners = bind_native_final_xml(
            src, staged, packet_path, require_staged_lineage=True)
        assert_preaccepted_geometry_unchanged(src, bound)
        audit = audit_finalized_physical_endpoints(parse_bytes(bound.read_bytes()))
        if (audit["twoEndpointPhysicalParts"] != 14 or
                len(owners) != 14 or audit["doubleAcceptedPairs"]):
            raise NativeMassError("S1_NATIVE_BINDING_ALIAS_CENSUS")
        receipt["boundTestInputSha256"] = hashlib.sha256(bound.read_bytes()).hexdigest()
        # In this isolated S1 geometry the PCOM -1 rows stay in ORIGINAL
        # source/lineage evidence, not as a manufactured positive native
        # predecessor to the weighted FLAN entry. Promoting PCOM endpoint 2
        # would wrongly split 19.1 into 15.9 + 3.2 mm.
        doc = native._parse_xml_document(bound, preserve_rigid_weight_owners=False)
        model = patched._build_conversion_model(doc, {}, {}, {})
        require_rigid_weight_owners(bound, model, s1_test_only_witness=receipt)
        # The actual native serializer produces full CONTROL, ELEMENTS and
        # RIGID sections. No release/independent reconciliation authority.
        cii = native._build_cii_text(model, "first", "2019 TEST ONLY",
                                     weight_scale=10, support_config={})
        verify_actual_cii(cii, receipt)
        return cii, receipt


def _table_csv(receipt):
    fields = ["branch", "pcomRef", "flangeRef", "sourceNodeOrdinals",
              "connectionFrom", "connectionTo", "connectionMm",
              "flangeFrom", "flangeTo", "flangeMm",
              "actualTestCiiConnectionElementIndex",
              "actualTestCiiConnectionRigidPointer", "weightKg",
              "actualTestCiiSuggestedForceN", "status", "formula", "referenceRow",
              "actualTestCiiFlangeElementIndex",
              "actualTestCiiFlangeRigidPointer", "actualTestCiiFlangeForceN"]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    for row in receipt["checkpoints"]:
        writer.writerow({key: json.dumps(row[key]) if isinstance(row.get(key), (dict, list))
                         else row.get(key, "") for key in fields})
    return output.getvalue()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--r9-xml", type=Path, required=True)
    parser.add_argument("--test-only-out-dir", type=Path, required=True)
    args = parser.parse_args()
    raw = args.r9_xml.read_bytes()
    if len(raw) != 687252 or hashlib.sha256(raw).hexdigest() != R9_SHA256:
        raise NativeMassError("S1_EXACT_R9_INPUT_SHA_MISMATCH")
    cii, receipt = render_s1_nonrelease(raw)
    if not receipt.get("actualCiiBytesChecked"):
        raise NativeMassError("S1_TEST_CII_NOT_VERIFIED")
    args.test_only_out_dir.mkdir(parents=True, exist_ok=True)
    (args.test_only_out_dir / "S1_TEST_ONLY_NON_RELEASE.cii").write_text(
        cii, encoding="utf-8")
    (args.test_only_out_dir / "S1_TEST_ONLY_NON_RELEASE_RECEIPT.json").write_text(
        json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    (args.test_only_out_dir / "S1_TEST_ONLY_NON_RELEASE_PAIRS.csv").write_text(
        _table_csv(receipt), encoding="utf-8")


if __name__ == "__main__":
    main()
