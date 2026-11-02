"""Recalculate the entire contraction audit from original and Final XML."""
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'converters/scripts'))
from xml229_preacceptance_contraction_audit import verify_audit


def require(ok,code):
    if not ok:
        raise ValueError(code)


def main():
    doc=json.load(sys.stdin)
    expected=verify_audit(
        ET.fromstring(doc['originalXmlText']),ET.fromstring(doc['finalizedXmlText']),
        doc['retainedSourceOrdinalsByBranch'],
        doc.get('branchConnectionAliases') or [],
        doc['sourceXmlSha256'],
        doc['canonicalVertexContractionAudit'],require,
    )
    print(json.dumps({'verified':True,'zeroLengthEdges':
        expected['summary']['retainedZeroLengthSourceEdges'],
        'nativeCiiReleaseAuthorized':False}))


if __name__=='__main__':
    try:main()
    except (ValueError,TypeError,ET.ParseError) as exc:
        print(str(exc),file=sys.stderr)
        sys.exit(1)
