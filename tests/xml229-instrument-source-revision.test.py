"""Approval-gated instrument source revision, with no real engineering approval fabricated."""
from pathlib import Path
from tempfile import TemporaryDirectory
import hashlib
import json
import sys
import unittest
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1] /
                       "converters" / "scripts"))
from xml229_instrument_source_revision import (
    ClassificationRefused, approve, audit, inspect,
)


def fixture():
    return ("""<PipeStressExport><Pipe><Branch><Branchname>TEST</Branchname>
<Node><NodeNumber>10</NodeNumber><ComponentType>PIPE</ComponentType>
<Position>0 0 0</Position></Node>
<Node><NodeNumber>-1</NodeNumber><ComponentType>INST</ComponentType>
<ComponentRefNo>=INS-1</ComponentRefNo><Endpoint>1</Endpoint>
<Position>20 0 0</Position><Weight>0</Weight></Node>
<Node><NodeNumber>-1</NodeNumber><ComponentType>INST</ComponentType>
<ComponentRefNo>=INS-1</ComponentRefNo><Endpoint>2</Endpoint>
<Position>325 0 0</Position><Weight>0</Weight></Node>
</Branch></Pipe></PipeStressExport>""")


class SourceInstrumentClassificationTests(unittest.TestCase):
    def test_real_ef05_inspection_is_pending_and_source_bound(self):
        benchmark = (Path(__file__).resolve().parents[1] /
                     "Benchmarks" / "EF-05-PRO.TEST.xml")
        review = inspect(benchmark)
        self.assertEqual(review["schema"],
                         "XML229.InstrumentSourceClassificationApproval.v1")
        self.assertEqual(len(review["components"]), 14)
        self.assertEqual(len(set(
            x["componentRefNo"] for x in review["components"])), 14)
        self.assertTrue(all(
            x["classification"] == "PENDING" and
            x["evidenceSha256"] == "" and x["approvedBy"] == ""
            for x in review["components"]))
        self.assertEqual(review["sourceXmlSha256"],
                         hashlib.sha256(benchmark.read_bytes()).hexdigest())

    def test_missing_approvals_refuse_any_output(self):
        with TemporaryDirectory() as tmp:
            d = Path(tmp)
            source, approval = d / "source.xml", d / "review.json"
            output, receipt = d / "revised.xml", d / "receipt.json"
            xml = fixture()
            source.write_text(xml)
            approval.write_text(json.dumps(inspect(source)))
            with self.assertRaises(ClassificationRefused) as err:
                approve(source, approval, output, receipt)
            self.assertEqual(str(err.exception),
                             "INSTRUMENT_ENGINEERING_CLASSIFICATION_REQUIRED")
            self.assertFalse(output.exists())
            self.assertFalse(receipt.exists())
            self.assertEqual(source.read_text(), xml)

    def test_complete_synthetic_approval_writes_new_source_not_accepted_kg(self):
        # Synthetic evidence tests gate mechanics; never real EF05 approval.
        with TemporaryDirectory() as tmp:
            d = Path(tmp)
            source, approval = d / "original.xml", d / "review.json"
            output, receipt = d / "new-original.xml", d / "new-source-proof.json"
            evidence = d / "synthetic-evidence.txt"
            source.write_text(fixture())
            evidence.write_text(
                "SYNTHETIC TEST ONLY: authorized reviewer mock in isolated unittest.")
            review = inspect(source)
            row = review["components"][0]
            row.update(
                classification="RIGID", approvedBy="Synthetic Engineer Fixture",
                approvedAtUtc="2026-10-20T12:00:00Z",
                evidencePath=evidence.name,
                evidenceSha256=hashlib.sha256(evidence.read_bytes()).hexdigest(),
                evidenceCitation="Synthetic fixture, rev 1, not EF05")
            approval.write_text(json.dumps(review))
            result = approve(source, approval, output, receipt)
            self.assertEqual(result["classifiedCount"], 1)
            self.assertFalse(result["kilogramsAccepted"])
            self.assertFalse(result["governedCiiReleaseAuthorized"])
            self.assertFalse(result["reusablePreviousWeightReview"])
            self.assertNotEqual(result["oldSourceXmlSha256"],
                                result["newSourceXmlSha256"])
            self.assertEqual(result, json.loads(receipt.read_text()))
            self.assertEqual(source.read_text(), fixture())
            original, pending = audit(output.read_bytes())
            self.assertEqual(pending, [])
            branch = next(x for x in original.iter() if x.tag == "Branch")
            nodes = [x for x in branch if x.tag == "Node"]
            self.assertIsNone(nodes[1].find("Rigid"))
            self.assertEqual(nodes[2].find("Rigid").text, "2")
            self.assertEqual(nodes[2].find("Weight").text, "0")
            self.assertEqual(nodes[2].find("NodeNumber").text, "-1")
            with self.assertRaises(ClassificationRefused) as err:
                approve(source, approval, output, receipt)
            self.assertEqual(str(err.exception),
                             "INSTRUMENT_OUTPUT_MUST_BE_NEW_REVISION")

    def test_stale_source_or_unverifiable_evidence_never_changes_source(self):
        with TemporaryDirectory() as tmp:
            d = Path(tmp)
            source, approval = d / "source.xml", d / "approval.json"
            output, receipt = d / "out.xml", d / "out.json"
            evidence = d / "document.txt"
            source.write_text(fixture())
            evidence.write_text("SYNTHETIC fixture evidence only.")
            review = inspect(source)
            row = review["components"][0]
            row.update(
                classification="RIGID", approvedBy="Synthetic Engineer Fixture",
                approvedAtUtc="2026-10-20T12:00:00+00:00",
                evidencePath=evidence.name,
                evidenceSha256="f" * 64,
                evidenceCitation="Synthetic fixture, ref ABC")
            approval.write_text(json.dumps(review))
            with self.assertRaises(ClassificationRefused) as err:
                approve(source, approval, output, receipt)
            self.assertEqual(str(err.exception),
                             "INSTRUMENT_EVIDENCE_BYTES_MISMATCH")
            row["evidenceSha256"] = hashlib.sha256(evidence.read_bytes()).hexdigest()
            review["sourceXmlSha256"] = "0" * 64
            approval.write_text(json.dumps(review))
            with self.assertRaises(ClassificationRefused) as err:
                approve(source, approval, output, receipt)
            self.assertEqual(str(err.exception),
                             "INSTRUMENT_APPROVAL_SOURCE_SHA_DRIFT")
            self.assertFalse(output.exists())
            self.assertFalse(receipt.exists())
            self.assertEqual(source.read_text(), fixture())

    def test_partial_instrument_approval_is_not_sufficient(self):
        with TemporaryDirectory() as tmp:
            d = Path(tmp)
            source, approval = d / "source.xml", d / "approval.json"
            original = fixture()
            # Separate second branch to force two independently approved parts.
            source.write_text(original.replace(
                "</Pipe></PipeStressExport>",
                "<Branch><Branchname>SECOND</Branchname>" +
                original.split("<Branch>")[1].split("</Branch>")[0]
                .replace("INS-1", "INS-2") +
                "</Branch></Pipe></PipeStressExport>"))
            data = inspect(source)
            self.assertEqual(len(data["components"]), 2)
            data["components"].pop()
            approval.write_text(json.dumps(data))
            with self.assertRaises(ClassificationRefused) as err:
                approve(source, approval, d / "out.xml", d / "out.json")
            self.assertEqual(str(err.exception),
                             "INSTRUMENT_APPROVAL_COVERAGE_INCOMPLETE")
            self.assertFalse((d / "out.xml").exists())


if __name__ == "__main__":
    unittest.main()
