import copy
import unittest

from scripts.inputxml_compiler.base import DecisionLedger
from scripts.inputxml_compiler.counts import _new_root
from scripts.inputxml_compiler.pdf_input_echo_accounting import (
    verify_pdf_input_echo_accounting,
)
from scripts.inputxml_compiler.pdf_input_echo_provenance import (
    extract_input_echo_text,
)
from scripts.inputxml_compiler.pdf_input_echo_runtime import (
    _input_echo_blocks,
    _strict_report_header,
    compile_pdf_input_echo_source,
)
from scripts.inputxml_compiler.pdf_input_echo_scopes import validate_line_scopes
from scripts.inputxml_compiler.pdf_input_echo_state import resolve_line_scoped_blocks
from tests.test_inputxml_pdf_input_echo_line_scope import (
    two_line_report,
    two_scopes,
)
from tests.test_inputxml_pdf_input_echo_support import (
    context_for,
    line_scope,
    one_line_report,
)


class PdfInputEchoAccountingTests(unittest.TestCase):
    def build(self, text, scopes):
        context = context_for(text, scopes)
        ledger = DecisionLedger(
            source_repository="reallaksh19/3D_Converters",
            source_path="test://pdf-accounting",
            producer="pdf-accounting-test",
            dialect="pdf-input-echo",
        )
        root = compile_pdf_input_echo_source(
            text.encode("utf-8"),
            source_name="input.txt",
            ledger=ledger,
            context=context,
            root_factory=_new_root,
        )
        evidence_ledger = DecisionLedger(
            source_repository=ledger.source_repository,
            source_path=ledger.source_path,
            producer=ledger.producer,
            dialect=ledger.dialect,
        )
        extracted, provenance = extract_input_echo_text(
            text.encode("utf-8"),
            source_name="input.txt",
            context=context,
        )
        job, date, time = _strict_report_header(extracted)
        blocks = _input_echo_blocks(extracted)
        validated_scopes, by_block, _ = validate_line_scopes(
            context,
            block_count=len(blocks),
        )
        resolved = resolve_line_scoped_blocks(
            blocks,
            by_block,
            evidence_ledger,
        )
        return {
            "model": root.find("PIPINGMODEL"),
            "ledger": ledger,
            "provenance": provenance,
            "reportHeader": {"jobName": job, "date": date, "time": time},
            "scopes": validated_scopes,
            "blocks": blocks,
            "resolved": resolved,
        }

    def verify(self, fixture, *, unsupported=None, unparsed=None):
        return verify_pdf_input_echo_accounting(
            fixture["model"],
            ledger=fixture["ledger"],
            provenance=fixture["provenance"],
            report_header=fixture["reportHeader"],
            scopes=fixture["scopes"],
            blocks=fixture["blocks"],
            resolved=fixture["resolved"],
            unsupported_section_ids=unsupported or [],
            unparsed_evidence_ids=unparsed or [],
        )

    def test_baseline_proof_is_complete(self):
        fixture = self.build(one_line_report(), [
            line_scope("scope-A", "LINE-A", [1, 2]),
        ])
        status, proof = self.verify(fixture)
        self.assertEqual("COMPLETE", status)
        self.assertTrue(all(value == 0 for value in proof["invariants"].values()))

    def test_valid_line_id_substituted_onto_wrong_blocks_still_blocks(self):
        fixture = self.build(two_line_report(), two_scopes())
        first = fixture["model"].findall("PIPINGELEMENT")[0]
        first.set("LINE", "LINE-B")
        for row in fixture["ledger"].records:
            if "PDF-PE-000001" in (row.get("canonicalElementIds") or []):
                fields = row.get("sourceFields")
                if isinstance(fields, dict) and "lineId" in fields:
                    fields["lineId"] = "LINE-B"
        status, proof = self.verify(fixture)
        self.assertEqual("BLOCKED", status)
        self.assertGreater(proof["invariants"]["elementLineMismatchCount"], 0)

    def test_inheritance_predecessor_from_another_line_blocks(self):
        fixture = self.build(two_line_report(), two_scopes())
        record = next(
            row for row in fixture["ledger"].records
            if row["sourceEntityId"] == "PDF-PE-000002@DIAMETER"
        )
        record["sourceFields"]["predecessorLineScopeId"] = "scope-B"
        record["sourceFields"]["predecessorBlockId"] = "PDF-BLOCK-000003"
        record["sourceFields"]["predecessorElementId"] = "PDF-PE-000003"
        status, proof = self.verify(fixture)
        self.assertEqual("BLOCKED", status)
        self.assertEqual(1, proof["invariants"]["crossLineInheritanceCount"])

    def test_removed_source_block_record_blocks(self):
        fixture = self.build(one_line_report(), [
            line_scope("scope-A", "LINE-A", [1, 2]),
        ])
        fixture["ledger"].records = [
            row for row in fixture["ledger"].records
            if row["sourceEntityId"] != "PDF-BLOCK-000002"
        ]
        status, proof = self.verify(fixture)
        self.assertEqual("BLOCKED", status)
        self.assertGreater(proof["invariants"]["blockRecordMismatchCount"], 0)

    def test_source_block_element_cardinality_mismatch_blocks(self):
        fixture = self.build(one_line_report(), [
            line_scope("scope-A", "LINE-A", [1, 2]),
        ])
        fixture["model"].remove(fixture["model"].findall("PIPINGELEMENT")[1])
        status, proof = self.verify(fixture)
        self.assertEqual("BLOCKED", status)
        self.assertEqual(
            1,
            proof["invariants"]["blockElementCardinalityMismatchCount"],
        )

    def test_duplicate_state_decision_blocks_last_value_wins_attempt(self):
        fixture = self.build(one_line_report(), [
            line_scope("scope-A", "LINE-A", [1, 2]),
        ])
        record = next(
            row for row in fixture["ledger"].records
            if row["sourceEntityId"] == "PDF-PE-000002@DIAMETER"
        )
        duplicate = copy.deepcopy(record)
        duplicate["recordId"] = "IXCC-TAMPER-DUPLICATE"
        duplicate["sourceFields"]["value"] = "999"
        fixture["ledger"].records.append(duplicate)
        status, proof = self.verify(fixture)
        self.assertEqual("BLOCKED", status)
        self.assertEqual(1, proof["invariants"]["duplicateStateDecisionCount"])

    def test_restamped_provenance_ledger_tamper_blocks(self):
        fixture = self.build(one_line_report(second_block=False), [
            line_scope("scope-A", "LINE-A", [1]),
        ])
        provenance = next(
            row for row in fixture["ledger"].records
            if row["sourceType"] == "PDF_INPUT_ECHO_PROVENANCE"
        )
        provenance["sourceFields"] = copy.deepcopy(provenance["sourceFields"])
        provenance["sourceFields"]["sourceDocumentHashSha256"] = "f" * 64
        provenance["sourceFields"]["provenanceHashSha256"] = "e" * 64
        status, proof = self.verify(fixture)
        self.assertEqual("BLOCKED", status)
        self.assertEqual(1, proof["invariants"]["provenanceMismatchCount"])

    def test_unaccounted_unsupported_section_blocks(self):
        text = one_line_report(
            second_block=False,
            extra_first=["HANGERS"],
        )
        fixture = self.build(text, [line_scope("scope-A", "LINE-A", [1])])
        expected = ["document/section/HANGERS"]
        fixture["ledger"].records = [
            row for row in fixture["ledger"].records
            if row["sourceType"] != "PDF_UNSUPPORTED_REPORT_SECTION"
        ]
        status, proof = self.verify(fixture, unsupported=expected)
        self.assertEqual("BLOCKED", status)
        self.assertEqual(
            1,
            proof["invariants"]["unsupportedSectionAccountingMismatchCount"],
        )


if __name__ == "__main__":
    unittest.main()
