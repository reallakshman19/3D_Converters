"""XML229 R2-C2: read-only per-original-physical RIGID slot audit.

This is NOT a general Weight→CII release authority. RIGID=2 (to-node)
is the only proven slot family. VALV, INST, split FLAN or other physical
weights MUST fail closed until the native converter emits their own
complete original-occurrence-to-CII field receipts.

Called only after upstream R2-C1 original→enriched XML transfer was
independently established; the manifest's originalOccurrenceId is the
authority, never NodeNumber or branch label on its own.
"""
import hashlib
import math


class NativePhysicalSlotError(ValueError):
    def __init__(self, code, detail):
        super().__init__(f"{code}: {detail}")
        self.code = code


def _reject(code, detail):
    raise NativePhysicalSlotError(code, detail)


def _position(raw):
    try:
        values = tuple(float(x) for x in str(raw).split())
    except (ValueError, TypeError):
        _reject("INVALID_ENRICHED_POSITION", "Enriched XML physical position is not numeric")
    if len(values) != 3 or not all(math.isfinite(x) for x in values):
        _reject("INVALID_ENRICHED_POSITION", "Expected exactly three finite source coordinates")
    return values


def _cii_rigid_rows(cii_text, expected_count):
    lines = str(cii_text).splitlines()
    header = "#$ RIGID"
    locations = [i for i, line in enumerate(lines) if line.strip() == header]
    if len(locations) != 1:
        _reject("CII_RIGID_SECTION_AMBIGUOUS", "Exactly one CII RIGID section is required")
    start = locations[0] + 1
    following = next((i for i in range(start, len(lines))
                      if lines[i].startswith("#$ ")), len(lines))
    rows = lines[start:following]
    if len(rows) != expected_count:
        _reject("CII_RIGID_SLOT_CARDINALITY", "Native RIGID rows do not equal model.rigid_edges")
    values = []
    for row in rows:
        # The native writer uses a fixed 15-char FIRST field for RIGID weight.
        try:
            value = float(row[:15].strip())
        except ValueError:
            _reject("INVALID_CII_RIGID_KG", "Native CII RIGID slot has no numeric mass")
        if not math.isfinite(value) or value < 0:
            _reject("INVALID_CII_RIGID_KG", "Native CII RIGID slot is negative or nonfinite")
        values.append(value)
    return values


def audit_original_rigid_native_slots(transfer, model, cii_text, *, weight_scale=1.0):
    """Verify EXACT R2-C1 to-node owners against the actual emitted CII rows.

    No writes, no repairs, no release. Reject unsupported physical types,
    missing model edges, ambiguous source owners, extra weighted RIGID slots,
    wrong CII mass conversion, and duplicate source occurrence IDs.
    """
    if (not isinstance(transfer, dict) or
        transfer.get("schema") != "XML229.R2.OriginalPhysicalEngineInputTransfer.v1" or
        transfer.get("complete") is not True or
        transfer.get("nativeCiiReleaseAuthorized") is not False or
        not isinstance(transfer.get("matches"), list) or
        len(transfer["matches"]) != transfer.get("originalPhysicalCount") or
        not transfer.get("basisId") or not transfer.get("finalIntentSha256") or
        not transfer.get("engineInputSha256")):
        _reject("FULL_SOURCE_TRANSFER_REQUIRED", "R2-C1 canonical source and Final transfer required")
    if not math.isfinite(weight_scale) or weight_scale <= 0:
        _reject("INVALID_CII_WEIGHT_SCALE", "Positive finite native kg conversion factor required")
    rigid_edges = getattr(model, "rigid_edges", None)
    if not isinstance(rigid_edges, list):
        _reject("NATIVE_MODEL_REQUIRED", "Actual native converter model with ordered rigid_edges required")
    masses = _cii_rigid_rows(cii_text, len(rigid_edges))
    # Branch-name to branch occurrence can be ambiguous in native model:
    # refuse when two source branch occurrences share the same label.
    branches = {}
    used = set()
    receipt = []
    for item in transfer["matches"]:
        original_id = item.get("originalOccurrenceId")
        if not original_id or original_id in used:
            _reject("ORIGINAL_PHYSICAL_DUPLICATE", "Source original occurrence repeated or omitted")
        used.add(original_id)
        if item.get("rigid") != "2":
            _reject("UNSUPPORTED_NATIVE_WEIGHT_SECTION",
                    "Only explicit RIGID=2 to-node CII RIGID slots audited; VALV/INST/FLAN held")
        branch_index = item.get("branchOccurrenceIndex")
        branch_label = item.get("branchName")
        if not isinstance(branch_index, int) or branch_index < 0 or not branch_label:
            _reject("BRANCH_OCCURRENCE_REQUIRED", "Original branch ordinal and name required")
        previous = branches.setdefault(branch_label, branch_index)
        if previous != branch_index:
            _reject("BRANCH_NAME_ALIAS", "Native model lacks original branch occurrence ordinals")
        try:
            node_number = int(item.get("engineNodeNumber"))
        except (ValueError, TypeError):
            _reject("NODE_NUMBER_REQUIRED", "Native model to-node number missing")
        xyz = _position(item.get("enginePosition"))
        expected = item.get("engineWeightKg")
        if not isinstance(expected, (int, float)) or not math.isfinite(expected) or expected <= 0:
            _reject("INVALID_ENGINE_WEIGHT", "Approved engine weight is not positive finite kg")
        candidates = []
        for i, edge in enumerate(rigid_edges):
            node = edge.to_node
            source_number = (node.source_node_number if node.source_node_number is not None
                             else node.node_number)
            if (edge.branch_name == branch_label and
                source_number == node_number and
                tuple(float(x) for x in node.position) == xyz and
                str(node.component_type) == item.get("componentType") and
                str(node.component_ref_no) == item.get("componentRefNo") and
                ("" if node.endpoint is None else str(node.endpoint)) == item.get("endpoint") and
                str(node.node_name or "") == item.get("nodeName")):
                candidates.append(i)
        if len(candidates) != 1:
            _reject("NATIVE_PHYSICAL_OWNER_NOT_UNIQUE",
                    f"Original physical occurrence {original_id} has {len(candidates)} rigid owners")
        slot = candidates[0]
        if any(row["rigidSlotOrdinal"] == slot for row in receipt):
            _reject("NATIVE_RIGID_SLOT_REUSED", "Two original occurrences claimed the same CII slot")
        node_weight = float(rigid_edges[slot].to_node.weight)
        if not math.isclose(node_weight, float(expected), rel_tol=0, abs_tol=1e-9):
            _reject("NATIVE_MODEL_WEIGHT_DRIFT", "Model edge mass differs from reviewed original")
        expected_output = float(expected) * weight_scale
        if not math.isclose(masses[slot], expected_output, rel_tol=1e-9, abs_tol=1e-8):
            _reject("CII_RIGID_WEIGHT_DRIFT", "Actual CII slot differs from reviewed physical mass")
        receipt.append({"originalOccurrenceId":original_id,
                        "branchOccurrenceIndex":branch_index,
                        "engineNodeOrdinal":item.get("engineNodeOrdinal"),
                        "rigidSlotOrdinal":slot,"approvedKg":float(expected),
                        "ciiSlotMass":masses[slot]})
    # No hidden positive RIGID output mass may be left without a mapped source.
    claimed = {row["rigidSlotOrdinal"] for row in receipt}
    for i, mass in enumerate(masses):
        if i not in claimed and mass > 0:
            _reject("NATIVE_UNCLAIMED_WEIGHTED_SLOT", "Positive CII rigid mass has no original source")
    return {
      "schema":"XML229.R2.NativeRigidSlotAudit.v1",
      "basisId":transfer["basisId"],
      "finalIntentSha256":transfer["finalIntentSha256"],
      "engineInputSha256":transfer["engineInputSha256"],
      "ciiOutputSha256":hashlib.sha256(cii_text.encode("utf-8")).hexdigest(),
      "rigidSlotCount":len(masses),
      "verifiedOriginalRigidCount":len(receipt),
      "rigidSlots":receipt,
      "rigidOnlyVerified":True,
      "allPhysicalKindsVerified":False,
      "nativeCiiReleaseAuthorized":False,
      "status":"RIGID_SLOT_READ_ONLY_EVIDENCE",
    }
