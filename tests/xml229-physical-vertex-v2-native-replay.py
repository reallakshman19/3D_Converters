"""Replay actual JS V2 XML using independent native source-bound semantics."""
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'converters/scripts'))
from xml229_physical_vertex_prefinal import replay_physical_vertex_prefinal
from xml229_prefinal_restraints import restraint_semantics
from xml229_native_final_mass_binding import _semantic_xml


def require(ok, code):
    if not ok:
        raise ValueError(code)


def main():
    packet=json.load(sys.stdin)
    source=ET.fromstring(packet['originalXmlText'])
    final=ET.fromstring(packet['prefinalXmlText'])
    staged=json.loads(packet['stagedJsonText'])
    replay_physical_vertex_prefinal(
        source,staged,packet['config'],packet['physicalVertexMemberCensus'],require)
    restraint_semantics(source)
    restraint_semantics(final)
    require(_semantic_xml(source)==_semantic_xml(final),'NATIVE_V2_FULL_SOURCE_COMPARE_DRIFT')
    print(json.dumps({'verified':True,'nativeCiiReleaseAuthorized':False}))


if __name__=='__main__':
    try:
        main()
    except (ValueError,ET.ParseError) as exc:
        print(str(exc),file=sys.stderr)
        sys.exit(1)
