from .base import *
from .xml import *
from .extension import *
from .counts import *
from .children import *
from .elements import *
from .family import *
from .model import *
def _categorized_document(root: ET._Element, context: dict[str, Any], ledger: DecisionLedger) -> ET._Element:
    version = str(context.get("version") or "").strip()
    north = context.get("north")
    if not version or not isinstance(north, list) or len(north) != 3:
        raise CompileBlocked("CategorizedInputXML compilation requires explicit context: version and north[3].")
    source_name = root.get("sourceName") or "categorized-inputxml"
    wrapper, model = _new_root(version)
    model.set("JOBNAME", str(context.get("jobName") or source_name))
    if context.get("time"):
        model.set("TIME", str(context["time"]))
    model.set("ISSUE_NO", str(context.get("issueNo") or ""))
    for field, value in zip(("NORTH_X", "NORTH_Y", "NORTH_Z"), north):
        model.set(field, str(value))
    for field in COUNT_FIELDS:
        model.set(field, "0")

    element_index = 0
    for line_index, line in enumerate(root.findall("Line"), 1):
        line_id = (line.get("id") or "").strip()
        ledger.add(source_entity_id=f"CategorizedInputXML/Line[{line_index}]", source_type="CATEGORIZED_LINE", source_fields=dict(line.attrib), disposition="EMIT_1_TO_MANY", projection_cardinality="1_TO_MANY")
        line_no = (line.findtext("LineBlock/LineNo") or "").strip()
        if line_id and line_no and line_id != line_no:
            raise CompileBlocked(f"Categorized line id {line_id!r} conflicts with LineNo {line_no!r}.")
        canonical_line = line_no or line_id
        if not canonical_line:
            raise CompileBlocked("Categorized Line requires id or LineBlock/LineNo.")
        for element in line.findall("Element"):
            element_index += 1
            ledger.add(source_entity_id=f"CategorizedInputXML/Line[{line_index}]/Element[{element_index}]", source_type="CATEGORIZED_ELEMENT", source_fields=dict(element.attrib), disposition="EMIT_1_TO_1")
            entity_id = element.get("elementKey") or f"categorized-element-{element_index}"
            original_text = element.findtext("OriginalElement") or ""
            original = _parse_xml(original_text.encode("utf-8"), f"{entity_id}/OriginalElement")
            if _local(original.tag) != "PIPINGELEMENT" or _namespace(original.tag) != "":
                raise CompileBlocked(f"{entity_id} OriginalElement must contain one unqualified PIPINGELEMENT.")
            merged = copy.deepcopy(original)

            overlays: dict[str, str] = {
                "FROM_NODE": element.get("fromNode") or "",
                "TO_NODE": element.get("toNode") or "",
                "LINE": canonical_line,
            }
            for xpath, field in (
                ("NameBlock/FROM_NAME", "FROM_NAME"),
                ("NameBlock/TO_NAME", "TO_NAME"),
                ("NameBlock/LINE_ID", "LINE"),
                ("RouteGeometryBlock/DELTA_X", "DELTA_X"),
                ("RouteGeometryBlock/DELTA_Y", "DELTA_Y"),
                ("RouteGeometryBlock/DELTA_Z", "DELTA_Z"),
                ("SectionDimensionBlock/DIAMETER", "DIAMETER"),
                ("SectionDimensionBlock/WALL_THICK", "WALL_THICK"),
                ("SectionDimensionBlock/INSUL_THICK", "INSUL_THICK"),
            ):
                value = element.findtext(xpath)
                if value is not None and value.strip() != "":
                    if field in overlays and overlays[field] and overlays[field] != value.strip():
                        raise CompileBlocked(f"{entity_id} normalized fields conflict for {field}.")
                    overlays[field] = value.strip()
            for field, value in overlays.items():
                if not value:
                    continue
                source_candidates = [field]
                if field == "LINE":
                    source_candidates.append("LINE_ID")
                existing_values = [(name, merged.get(name)) for name in source_candidates if merged.get(name) is not None]
                for name, existing in existing_values:
                    equal = _same_numeric(existing or "", value) if field not in {"LINE", "FROM_NAME", "TO_NAME"} else (existing or "").strip() == value
                    if not equal and not _is_sentinel(existing):
                        raise CompileBlocked(f"{entity_id} normalized {field}={value!r} conflicts with OriginalElement {name}={existing!r}.")
                merged.set(field, value)
                if field == "LINE":
                    merged.attrib.pop("LINE_ID", None)
                ledger.add(
                    source_entity_id=f"{entity_id}/{field}",
                    source_type="CATEGORIZED_RECONCILIATION",
                    source_fields={"normalized": value, "original": existing_values},
                    disposition="EMIT_1_TO_1",
                    evidence=["normalized block reconciled with OriginalElement evidence"],
                    confidence={"identity":1.0,"topology":1.0,"geometry":1.0,"dimensions":1.0,"attributes":1.0,"ciiProjection":1.0},
                )
            merged.set("ID", _safe_ncname(element.get("elementKey") or f"E{element_index:06d}", "E"))

            nodes = [node.get("nodeNumber") for node in element.findall("NodesBlock/Node")]
            if nodes and (overlays["FROM_NODE"] not in nodes or overlays["TO_NODE"] not in nodes):
                raise CompileBlocked(f"{entity_id} NodesBlock does not contain both element endpoints.")
            _extension_record(merged, producer=ledger.producer, dialect=ledger.dialect, name="OriginalElement", source_path=ledger.source_path, source_entity_id=entity_id, source_field="OriginalElement", value=original_text, disposition="PRESERVE_EXTENSION", criticality="HIGH", confidence=1.0)
            ledger.add(source_entity_id=f"{entity_id}/OriginalElement", source_type="SOURCE_EVIDENCE", source_fields={"xml": original_text}, disposition="PRESERVE_EXTENSION", evidence=["reconciled source evidence preserved in canonical extension"])
            _ensure_extension_last(merged)
            model.append(merged)
            for review_path in ("LineBlock/PipingClass", "LineBlock/Rating"):
                review = line.find(review_path)
                if review is not None and (review.text or "").strip():
                    _preserve_attr(merged, ledger.source_path, entity_id, _local(review.tag), (review.text or "").strip(), ledger, blocking=False)
            for review_name in ("DerivedBlock", "BendBlock", "RigidBlock", "FlangeBlock", "MiscBlock"):
                review = element.find(review_name)
                if review is not None and (len(review) or (review.text or "").strip()):
                    _preserve_child(merged, review, ledger.source_path, entity_id, ledger, blocking=review_name in {"BendBlock", "RigidBlock", "FlangeBlock"})

    if element_index == 0:
        raise CompileBlocked("CategorizedInputXML contains no Element records.")
    _set_model_count_assertions(model)
    original_document = root.findtext("OriginalDocument")
    if original_document:
        _extension_record(wrapper, producer=ledger.producer, dialect=ledger.dialect, name="OriginalDocument", source_path=ledger.source_path, source_entity_id="CategorizedInputXML", source_field="OriginalDocument", value=original_document, disposition="PRESERVE_EXTENSION", criticality="MEDIUM", confidence=1.0)
    return wrapper

__all__ = [name for name in globals() if not name.startswith("__")]
