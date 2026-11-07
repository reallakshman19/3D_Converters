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
        require_s1_test_only_weight_owners(bound, model, receipt)
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


# S1-only custody. These tests cannot authorize ordinary production CII.
import xml.etree.ElementTree as ET

def _text(element, name):
    return next((child.text or "" for child in element
                 if child.tag.split("}")[-1] == name), "").strip()

def _s1_assert_pcom_release_hold(xml_path, model, witness):
    """Only the isolated S1 renderer can inspect SUGGESTED numeric CII bytes.

    The ordinary runtime never passes a witness. Even an S1 witness has no
    release authority; it merely validates two separately owned test edges.
    """
    import hashlib
    from pathlib import Path
    root = ET.parse(xml_path).getroot()
    def nodes(branch):
        return [n for n in branch if n.tag.split("}")[-1] == "Node"]
    branches = [n for n in root.iter() if n.tag.split("}")[-1] == "Branch"]
    target = []
    for branch in branches:
        ns = nodes(branch)
        for i in range(len(ns)-3):
            if [_text(n, "ComponentType").upper() for n in ns[i:i+4]] == [
                    "PCOM", "PCOM", "FLAN", "RIGID"]:
                target.append((branch, i))
    if not target and witness is None:
        return
    if witness is None:
        raise ValueError("CII_S1_SUGGESTED_PCOM_RELEASE_BLOCKED")
    checks = witness.get("checkpoints")
    if (witness.get("schema") != "RigidS1.NonReleasePcomFlangeWitness.v1" or
            witness.get("nativeCiiReleaseAuthorized") is not False or
            not isinstance(checks, list) or not checks or
            len(checks) != len(target) or
            witness.get("boundTestInputSha256") !=
            hashlib.sha256(Path(xml_path).read_bytes()).hexdigest()):
        raise ValueError("CII_S1_TEST_WITNESS_INVALID")
    physical_ids = set()
    pcom_ids = set()
    checked_edges = set()
    edges = list(model.rigid_edges)
    for p in checks:
        if (p.get("status") != "SUGGESTED" or
                p.get("ownerApproved") is not False or
                p.get("weightKg") is None or
                p.get("flangeOwnerKg") != 15 or
                p.get("flangeForceN") != 150 or
                p.get("fixturePCOMMinus1Ordinals") != [1, 2] or
                not isinstance(p.get("referenceRow"), dict)):
            raise ValueError("CII_S1_UNAPPROVED_MASS_CLAIM")
        physical = (p["branch"], p["flangeRef"])
        pc = (p["branch"], p["pcomRef"])
        if physical in physical_ids or pc in pcom_ids or physical == pc:
            raise ValueError("CII_S1_DOUBLE_PHYSICAL_OWNER")
        physical_ids.add(physical)
        pcom_ids.add(pc)
        actual_branch = next((b for b in branches
            if _text(b, "Branchname") == p["branch"]), None)
        if actual_branch is None:
            raise ValueError("CII_S1_BRANCH_LINEAGE_MISSING")
        ns = nodes(actual_branch)
        matching = [(a, b, c, d, idx) for idx, (a, b, c, d)
            in enumerate(zip(ns, ns[1:], ns[2:], ns[3:]))
            if (_text(a, "ComponentType"), _text(b, "ComponentType"),
                _text(c, "ComponentType"), _text(d, "ComponentType")) ==
                ("PCOM", "PCOM", "FLAN", "RIGID")
            and _text(a, "NodeNumber") == "-1" and
                _text(b, "NodeNumber") == "-1" and
                _text(c, "NodeNumber") == p["flangeFrom"] and
                _text(d, "NodeNumber") == p["flangeTo"]]
        if len(matching) != 1:
            raise ValueError("CII_S1_PCOM_ORDINAL_WITNESS_MISSING")
        a, b, c, d, _ = matching[0]
        if (_text(a, "ComponentRefNo").lstrip("=") != p["pcomRef"] or
                _text(b, "ComponentRefNo").lstrip("=") != p["pcomRef"] or
                _text(c, "ComponentRefNo").lstrip("=") != p["flangeRef"] or
                _text(d, "ComponentRefNo").lstrip("=") != p["flangeRef"] or
                abs(float(_text(c, "Weight")) - p["weightKg"]) > 1e-8 or
                abs(float(_text(d, "Weight")) - 15) > 1e-8 or
                p["weightKg"] == 15):
            raise ValueError("CII_S1_CONNECTION_BORROWED_FLANGE_MASS")
        for fr, to, kg, kind in (
                (p["connectionFrom"], p["connectionTo"], p["weightKg"], "FLAN"),
                (p["flangeFrom"], p["flangeTo"], 15, "RIGID")):
            matching_edges = [e for e in edges
                if e.branch_name == p["branch"] and
                str(e.from_node.node_number) == str(fr) and
                str(e.to_node.node_number) == str(to) and
                e.to_node.component_type == kind and
                abs(e.to_node.weight - kg) <= 1e-8]
            key = (p["branch"], str(fr), str(to))
            if len(matching_edges) != 1 or key in checked_edges:
                raise ValueError("CII_S1_CONNECTION_FLANGE_EDGE_OWNER_AMBIGUOUS")
            checked_edges.add(key)
    if len(checked_edges) != 2 * len(checks):
        raise ValueError("CII_S1_ELEMENT_OWNER_CENSUS_DRIFT")


def require_s1_test_only_weight_owners(xml_path, model, witness):
    """Explicit NON-RELEASE entrypoint; no ordinary converter can request it."""
    if not isinstance(witness, dict):
        raise NativeMassError("S1_TEST_ONLY_WITNESS_REQUIRED")
    return require_rigid_weight_owners(
        xml_path, model, s1_test_only_witness=witness)
