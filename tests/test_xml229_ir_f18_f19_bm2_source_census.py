"""Independent stdlib XML ElementTree check of original public BM2 evidence.

Do not import the JS witness module, trust its counts or certify Owner V6.
This is an independent input census, not acceptance of topology or CII.
"""
import hashlib
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

BM2 = (Path(__file__).resolve().parents[1] / "Benchmarks" /
       "XML-CII-2019" / "revamped" / "GLRD-1000-PI-01 - BM2.xml")

def tag(element):
    return element.tag.rsplit("}", 1)[-1]

def field(node, name):
    return next(((child.text or "").strip() for child in node
                 if tag(child) == name), "")

def rows_of(branch):
    return [node for node in branch if tag(node) == "Node"]

def positive(value):
    return value.isascii() and value.isdecimal() and int(value) > 0

def inspect():
    raw = BM2.read_bytes()
    source_hash = hashlib.sha256(raw).hexdigest()
    root = ET.fromstring(raw)
    branch_nodes = [rows_of(branch) for branch in root.iter() if tag(branch) == "Branch"]
    all_nodes = [row for rows in branch_nodes for row in rows]
    tee_junctions = []
    for bi, nodes in enumerate(branch_nodes):
        for i, node in enumerate(nodes):
            if field(node, "ComponentType") != "TEE" or field(node, "Endpoint") != "0":
                continue
            if i < 2 or i + 1 >= len(nodes):
                continue
            segment = nodes[i-2:i+2]
            if [field(x, "ComponentType") for x in segment] != ["TEE"]*4:
                continue
            if [field(x, "Endpoint") for x in segment] != ["1","3","0","2"]:
                continue
            refs = {field(x, "ComponentRefNo") for x in segment}
            if len(refs) != 1 or not positive(field(node, "NodeNumber")):
                continue
            tee_junctions.append((bi,i,node))
    brans = [(bi,ni,node) for bi,nodes in enumerate(branch_nodes)
             for ni,node in enumerate(nodes)
             if field(node,"ComponentType")=="BRAN" and
             field(node,"Endpoint") in ("1","2") and
             (ni==0 or ni==len(nodes)-1)]
    candidate = []
    for bi,ni,bran in brans:
        no,pos=field(bran,"NodeNumber"),field(bran,"Position")
        tees=[(tj,ti,tee) for tj,ti,tee in tee_junctions
              if tj!=bi and field(tee,"NodeNumber")==no and
              field(tee,"Position")==pos]
        station_peers=[n for n in all_nodes if
                       field(n,"NodeNumber")==no and field(n,"Position")==pos]
        if len(tees)==1 and len(station_peers)==2:
            candidate.append(((bi,ni),tees[0][:2]))
    zero_spans=[]
    for bi,nodes in enumerate(branch_nodes):
        for ni in range(1,len(nodes)):
            left,right=nodes[ni-1],nodes[ni]
            if field(left,"Position")==field(right,"Position"):
                zero_spans.append((bi,ni-1,left,right))
    positive_conflicts=[x for x in zero_spans
                        if positive(field(x[2],"NodeNumber")) and
                        positive(field(x[3],"NodeNumber")) and
                        field(x[2],"NodeNumber")!=field(x[3],"NodeNumber")]
    return {
        "sha256":source_hash, "branches":len(branch_nodes), "nodes":len(all_nodes),
        "tee":len(tee_junctions), "bran":len(brans),
        "candidate":len(candidate), "candidate_links":candidate,
        "zero_spans":len(zero_spans), "authored_positive_conflicts":len(positive_conflicts),
    }

class OriginalSourceCensus(unittest.TestCase):
    def test_BM2_original_xml_source_counts_independent_of_js(self):
        result=inspect()
        self.assertEqual({key:result[key] for key in (
            "branches","nodes","tee","bran","candidate","zero_spans",
            "authored_positive_conflicts")}, {
                "branches":31, "nodes":1196, "tee":31, "bran":57,
                "candidate":25, "zero_spans":357,
                "authored_positive_conflicts":27})
        self.assertEqual(len({x[0] for x in result["candidate_links"]}),25)
        self.assertEqual(len({x[1] for x in result["candidate_links"]}),25)
        self.assertEqual(len(result["sha256"]),64)
        print("PUBLIC_BM2_ORIGINAL_SOURCE_SHA256="+result["sha256"])

if __name__ == "__main__":
    unittest.main()
