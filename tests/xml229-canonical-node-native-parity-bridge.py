"""Independent Python parser invoked from the JS source/Final parity tests."""
import json
import sys
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "converters" / "scripts"))
from xml229_canonical_node_proposal import verify_proposal


def require(ok, code):
    if not ok:
        raise ValueError(code)


def main():
    packet = json.load(sys.stdin)
    expected = verify_proposal(
        ET.fromstring(packet["originalXmlText"]),
        ET.fromstring(packet["finalizedXmlText"]),
        packet["retainedSourceOrdinalsByBranch"],
        packet["canonicalNodeNumberProposal"],
        packet["sourceXmlSha256"],
        require,
    )
    print(json.dumps({"parityVerified": True, "groups": len(expected["groups"]),
                      "nativeReleaseAuthorized": False}, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, ET.ParseError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
