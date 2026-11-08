"""RIGID S2-R1: real native staging/binding/parser/serializer, R9-anchored; NEVER RELEASE.

CI uses a separate SMALL, entirely synthetic S2-R2 fixture. This exact-R9
proof is skipped unless the Owner locally supplies XML and JSON ledger through
RIGID_S2_R9_XML and RIGID_S2_R9_LEDGER; neither may be committed.
"""
import copy
from collections import Counter
import hashlib
import json
import math
import os
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"converters"/"scripts"))
import xml229_native_final_mass_binding as binder
import xml_to_cii2019 as native
import xml_to_cii2019_patched as patched

# Owner-controlled metadata is provided only in the local replay environment.
LEDGER_PATH=Path(os.environ.get("RIGID_S2_R9_LEDGER", "/__OWNER_LEDGER_NOT_PRESENT__"))
ORIGINAL_SHA=os.environ.get("RIGID_S2_R9_SHA256", "")
ORIGINAL_SIZE=int(os.environ.get("RIGID_S2_R9_BYTES", "0"))


def require_owner_input():
    if not (ORIGINAL_SHA and ORIGINAL_SIZE and
            os.environ.get("RIGID_S2_R9_XML") and
            LEDGER_PATH.is_file() and Path(os.environ["RIGID_S2_R9_XML"]).is_file()):
        raise unittest.SkipTest("EXACT_R9_SKIP: Owner XML, exact hash/size and ledger only available offline")

class S2R1Error(AssertionError): pass

def must(ok,code):
    if not ok: raise S2R1Error(code)

def load_ledger():
    require_owner_input()
    d=json.loads(LEDGER_PATH.read_text(encoding="utf-8"))
    must(d["sourceXmlSha256"]==ORIGINAL_SHA and
         d["releaseAuthorized"] is False and
         d["splitGeometryIndependentlyVerified"] is False,"S2R1_LEDGER_QUARANTINE")
    return d

def source_bytes():
    require_owner_input()
    data=Path(os.environ["RIGID_S2_R9_XML"]).read_bytes()
    must(len(data)==ORIGINAL_SIZE and
         hashlib.sha256(data).hexdigest()==ORIGINAL_SHA,
         "S2R1_PROTECTED_R9_HASH_DRIFT")
    return data,"OWNER_R9_VERIFIED_OFFLINE"

def decode_source(raw):
    root=binder.parse_bytes(raw)
    branches=binder.branches(root)
    must(len(branches)==31 and sum(len(binder.nodes(x)) for x in branches)==994,
         "S2R1_R9_SOURCE_POPULATION")
    byname={binder.txt(b,"Branchname"):(i,b) for i,b in enumerate(branches)}
    must(len(byname)==31,"S2R1_DUPLICATE_BRANCH")
    return root,byname

def reference_kg(source):
    if source["physicalFamily"]=="VALV":
        must(source["componentRef"].endswith("/8043") and source["dn"]==150,
             "S2R1_VALVE_MASTER_MISMATCH")
        return 365
    must(source["physicalFamily"]=="FLAN","S2R1_NONFLANGE_MASTER")
    return {50:15,80:17,100:29,150:59}[source["dn"]]

def verify_r9_ledger(ledger,raw):
    """An INDEPENDENT source read, never the JSON used to produce the CII."""
    root,byname=decode_source(raw)
    elems,sources=ledger["elements"],ledger["sources"]
    must(len(elems)==144 and len(sources)==154,"S2R1_LEDGER_POPULATION")
    source_map={s["sourceId"]:s for s in sources}
    must(len(source_map)==154,"S2R1_DUPLICATE_PHYSICAL_SOURCE")
    for source in sources:
        must(source["branch"] in byname,"S2R1_UNKNOWN_SOURCE_BRANCH")
        nodes=binder.nodes(byname[source["branch"]][1])
        original=[nodes[k] for k in source["sourceOrdinals"]]
        must([binder.txt(n,"NodeNumber") for n in original]==source["sourceNodeNumbers"] and
             all(binder.txt(n,"ComponentRefNo").lstrip("=")==source["componentRef"]
                 for n in original),"S2R1_PHYSICAL_SOURCE_IDENTITY_DRIFT")
        if source["status"] in ("OWNED","HELD"):
            kg=reference_kg(source)
            must(source["knownMassKg"]==kg and
                 any(math.isclose(float(binder.txt(n,"Weight") or 0),kg,abs_tol=1e-6)
                     for n in original),"S2R1_INDIVIDUAL_R9_KG_DRIFT")
        else:
            must(source["knownMassKg"] is None,"S2R1_UNKNOWN_NEVER_ZERO")
    for e in elems:
        must(e["branch"] in byname,"S2R1_ELEMENT_BRANCH_MISSING")
        ns=binder.nodes(byname[e["branch"]][1])
        a,z=[ns[k] for k in e["sourceOrdinalPair"]]
        must([int(binder.txt(n,"NodeNumber")) for n in (a,z)]==e["nodePair"],
             "S2R1_SOURCE_ORDINAL_NODE_DRIFT")
        pa,pz=[tuple(map(float,binder.txt(n,"Position").split())) for n in (a,z)]
        must(math.isclose(math.dist(pa,pz),e["lengthMm"],abs_tol=.01) and
             math.dist(pa,e["fromPositionMm"])<=.01 and
             math.dist(pz,e["toPositionMm"])<=.01,
             "S2R1_ORIGINAL_POSITION_LENGTH_DRIFT")
        if e["status"]=="OWNED":
            must(e["sourceGeometryClass"]=="OWNED" and
                 e["ownerElementId"]==e["elementId"] and
                 e["ownerSourceId"] in source_map and
                 source_map[e["ownerSourceId"]]["status"]=="OWNED" and
                 source_map[e["ownerSourceId"]]["knownMassKg"]==e["weightKg"] and
                 e["ownerSourceId"]==e["branch"]+"|"+
                    binder.txt(z,"ComponentRefNo").lstrip("=") and
                 binder.txt(a,"ComponentRefNo")==binder.txt(z,"ComponentRefNo"),
                 "S2R1_OWNED_SOURCE_GEOMETRY_DRIFT")
        elif e["status"]=="SUGGESTED":
            must(e["ownerSourceId"] is None and e["ownerElementId"] is None and
                 e["sourceGeometryClass"]=="CONNECTION" and
                 e["weightKg"]==2.63 and e["masterRowId"]==252,
                 "S2R1_SUGGESTED_BORROWS_OWNER")
        else:
            must(e["status"] in ("REVIEW","HELD") and
                 e["ownerSourceId"] is None and e["ownerElementId"] is None and
                 e["weightKg"] is None,"S2R1_REVIEW_BORROWS_OWNER")
    must(sum(x["knownMassKg"] for x in sources if x["status"]=="OWNED")==894 and
         sum(x["knownMassKg"] for x in sources if x["status"]=="HELD")==976,
         "S2R1_KNOWN_MASS_CONSERVATION")
    return root,byname

def verify_held_positions(ledger,byname):
    """R9 coordinate-based witness, not just same integer NodeNumber."""
    for s in (x for x in ledger["sources"] if x["status"]=="HELD"):
        ns=binder.nodes(byname[s["branch"]][1])
        a,z=[ns[i] for i in (s["sourceOrdinals"][0],s["sourceOrdinals"][-1])]
        pa,pz=[tuple(map(float,binder.txt(n,"Position").split())) for n in (a,z)]
        candidates=[e["elementId"] for e in ledger["elements"]
                    if e["branch"]==s["branch"] and
                    math.dist(pa,e["fromPositionMm"])<=.01 and
                    math.dist(pz,e["toPositionMm"])<=.01]
        must(s["ownerElementId"] is None and s["knownMassKg"]>0,
             "S2R1_HELD_CANNOT_ASSIGN")
        if s["componentRef"].endswith("/26728"):
            must(candidates==["E403"] and
                 "POSITION_MATCH_E403_PRODUCT_COLLAPSED" in s["holdReason"] and
                 "E403" in s["holdReason"],
                 "S2R1_DN100_E403_POSITION_HOLD")
        elif s["physicalFamily"]=="VALV":
            must(s["componentRef"].endswith("/8043") and
                 "VALVE_BODY_INTERCOMPONENT" in s["holdReason"] and
                 "audit_finalized_physical_endpoints" in s["holdRuleFileLine"],
                 "S2R1_VALVE_HELD_SPECIFIC_RULE")
        else:
            must("NO_UNIQUE_SOURCE_RIGID_OWNER" in s["holdReason"] and
                 s["branch"] in s["holdReason"] and
                 s["componentRef"] in s["holdReason"],
                 "S2R1_HELD_SOURCE_REASON_NOT_UNIQUE")
        expected_rule = ("converters/scripts/xml229_native_final_mass_binding.py:"
                         "429-483 audit_finalized_physical_endpoints; 827-856"
                         if s["physicalFamily"] == "VALV" else
                         "converters/scripts/xml229_native_final_mass_binding.py:"
                         "827-856; 972-1044")
        must(s["holdRuleFileLine"] == expected_rule,
             "S2R2_HELD_RULE_EXACT_FILE_LINES")
    return True

def native_r9_serialization(ledger,raw):
    """S1 path unchanged: stage_native_original_lineage -> bind -> parser -> writer."""
    root=ET.fromstring(raw)
    byname={binder.txt(b,"Branchname"):(i,b)
            for i,b in enumerate(binder.branches(root))}
    # ONLY mutate scratch XML. Original R9 bytes stay solely in Owner custody.
    for branch in binder.branches(root):
        for n in binder.nodes(branch):
            if binder.txt(n,"Rigid")=="2":
                w=binder.child(n,"Weight")
                if w is not None:w.text="0"
    for e in ledger["elements"]:
        if e["status"] not in ("OWNED","SUGGESTED"):continue
        bi,branch=byname[e["branch"]]
        n=binder.nodes(branch)[e["sourceOrdinalPair"][1]]
        must(binder.txt(n,"NodeNumber")==str(e["nodePair"][1]),
             "S2R1_STAGE_OWNER_ORDINAL")
        binder.child(n,"Weight").text=str(e["weightKg"])
    # Original R9 attests 17kg at node580. Product collapses 579->580 by 3.2mm.
    e59=next(x for x in ledger["elements"] if x["elementId"]=="E59")
    alias=next(n for n in binder.nodes(byname[e59["branch"]][1])
               if binder.txt(n,"NodeNumber")=="580")
    must(binder.txt(alias,"ComponentType")=="RIGID",
         "S2R1_PRODUCT_MERGE_ALIAS_TYPE")
    binder.child(alias,"Weight").text="17"
    isolated=ET.tostring(root,encoding="utf-8",xml_declaration=True)
    source_id="S2-R1-NONRELEASE-TEST-ONLY"
    components=[]
    for e in ledger["elements"]:
        if e["status"]!="OWNED":continue
        bi,branch=byname[e["branch"]]
        ni=e["sourceOrdinalPair"][1]
        n=binder.nodes(branch)[ni]
        components.append({"occurrenceId":binder._lineage_oid(source_id,bi,ni,n),
                           "effectiveKg":e["weightKg"]})
    must(len(components)==50,"S2R1_BOUND_OWNER_CENSUS")
    packet={"schema":binder.SCHEMA,"sourceId":source_id,
            "sourceXmlSha256":hashlib.sha256(isolated).hexdigest(),
            "basisId":hashlib.sha256(b"S2-R1-ONLY-BASIS"+isolated).hexdigest(),
            "finalIntentSha256":hashlib.sha256(b"S2-R1-NEVER-RELEASE"+isolated).hexdigest(),
            "physicalCount":len(components),"components":components,
            "nativeCiiReleaseAuthorized":False,"s1TestOnlyNonrelease":True}
    with TemporaryDirectory(prefix="rigid-s2-r1-native-") as td:
        input_path=Path(td)/"derived-testonly.xml";input_path.write_bytes(isolated)
        packet_path=Path(td)/"unapproved-testonly-packet.json"
        packet_path.write_text(json.dumps(packet))
        staged=binder.stage_native_original_lineage(input_path,packet_path)
        bound,owners=binder.bind_native_final_xml(
            input_path,staged,packet_path,require_staged_lineage=True)
        must(len(owners)==50,"S2R1_BINDER_LOST_ACCEPTED_OWNER")
        document=native._parse_xml_document(bound,preserve_rigid_weight_owners=False)
        model=patched._build_conversion_model(document,{},{},{})
        cii=native._build_cii_text(model,"first","S2-R1 NONRELEASE",
                                   weight_scale=10,support_config={})
    return model,cii,hashlib.sha256(isolated).hexdigest()

def verify_sidecar(cii,sidecar):
    """Independent CII byte reparse, with no numeric unknown/0 authority."""
    must(sidecar["nativeCiiReleaseAuthorized"] is False and
         sidecar["splitGeometryIndependentlyVerified"] is False and
         sidecar["releaseBlocked"] is True,
         "S2R1_FINAL_RELEASE_BLOCKED")
    slots,weights=binder.emitted_sections(cii)
    elements=binder._cii_elements(cii)
    must(len(elements)==433 and len(weights)==143 and len(slots)==143 and
         len(sidecar["rigidPointers"])==143,"S2R1_SIDECAR_CENSUS")
    must(sidecar["ciiSha256"]==hashlib.sha256(cii.encode("utf-8")).hexdigest(),
         "S2R1_SIDECAR_SHA_DRIFT")
    for k,p in sidecar["rigidPointers"].items():
        number=int(k);ix=p["ciiElementIndex"];force=weights[number-1]
        must(p["pointer"]==number and slots[number-1][0]==ix and
             elements[ix][2]==number,"S2R1_SIDECAR_ELEMENT_POINTER_DRIFT")
        if force==0:
            must(p["status"] in ("REVIEW","HELD") and p["weightKg"] is None,
                 "S2R1_ZERO_CII_FORCE_REQUIRES_UNRESOLVED_LABEL")
        else:
            must(p["status"] in ("OWNED","SUGGESTED") and
                 p["weightKg"] is not None and
                 math.isclose(force,10*p["weightKg"],abs_tol=1e-6),
                 "S2R1_ASSIGNED_FORCE_SIDECAR_DRIFT")
        if p["status"] in ("SUGGESTED","REVIEW","HELD"):
            must(p["ownerSourceId"] is None,
                 "S2R1_SIDECAR_UNAPPROVED_OWNER")
        held = p.get("heldSources")
        must(isinstance(held,list) and
             all(isinstance(x,dict) and isinstance(x.get("sourceId"),str)
                 and isinstance(x.get("kg"),(int,float)) and x["kg"]>0
                 for x in held) and
             (not held or p["status"] in ("REVIEW","HELD")),
             "S2R2_HELD_SIDECAR_INVALID")
    all_held=[x for p in sidecar["rigidPointers"].values()
              for x in p["heldSources"]]
    must(len(all_held)==32 and
         len({x["sourceId"] for x in all_held})==32 and
         sum(x["kg"] for x in all_held)==976,
         "S2R2_HELD_32_SOURCES_976_KG_CENSUS")
    must(any(p["status"] in ("REVIEW","HELD")
             for p in sidecar["rigidPointers"].values()),
         "S2R1_NO_UNRESOLVED_RELEASE_PROHIBITED")
    return True

def verify_product_bytes(ledger,model,cii,basis,source_hash,byname=None):
    slots,weights=binder.emitted_sections(cii)
    elements=binder._cii_elements(cii)
    must(len(model.edges)==433 and len(elements)==433 and
         len(model.rigid_edges)==143 and len(weights)==143,
         "S2R1_REAL_NATIVE_143_RIGID_CENSUS")
    projected={(e["branch"],tuple(e["nodePair"])):e for e in ledger["elements"]}
    matching=set();extra=[];alias_ids=set();side={}
    for i,edge in enumerate(model.edges):
        if i not in model.edge_to_rigid_index:continue
        pointer=model.edge_to_rigid_index[i]
        frm,to=edge.from_node.node_number,edge.to_node.node_number
        must(int(float(elements[i][0]))==frm and
             int(float(elements[i][1]))==to and
             elements[i][2]==pointer and slots[pointer-1][0]==i,
             "S2R1_REAL_NATIVE_CII_POINTER_DRIFT")
        item=projected.get((edge.branch_name,(frm,to)))
        cause=None
        if item is not None:
            matching.add(item["elementId"])
            status=item["status"];kg=item["weightKg"]
        else:
            # Derive product-only edges from the PRODUCT PARSER's positions.
            # Do not look up literal pairs: a short collapsed endpoint is
            # recognized by geometric start alignment and a 3.2mm span delta.
            extra.append((edge.branch_name,frm,to))
            candidates=[]
            for candidate in ledger["elements"]:
                if candidate["branch"]!=edge.branch_name:continue
                start_gap=math.dist(candidate["fromPositionMm"],edge.from_node.position)
                length_gap=math.dist(edge.from_node.position,edge.to_node.position)-candidate["lengthMm"]
                if start_gap<=.01 and 3.0<=length_gap<=3.4:
                    candidates.append((candidate,length_gap))
            must(len(candidates)==1,"S2R2_PRODUCT_MERGE_NOT_SOURCE_DERIVED")
            item,merge_mm=candidates[0]
            must(item["elementId"] not in alias_ids,
                 "S2R2_PRODUCT_MERGE_DUPLICATE_ALIAS")
            alias_ids.add(item["elementId"])
            status=("OWNED" if item["status"]=="OWNED" else "HELD")
            kg=item["weightKg"] if status=="OWNED" else None
            cause=f"PRODUCT_SHORT_NODE_MERGE_{merge_mm:.1f}MM"
        actualN=weights[pointer-1]
        must((math.isclose(actualN,10*kg,abs_tol=1e-6)
              if status in ("OWNED","SUGGESTED") else actualN==0.0),
             "S2R1_REAL_NATIVE_FORCE_LEDGER_DRIFT")
        side[str(pointer)]={"pointer":pointer,"ciiElementIndex":i,
          "fromTo":[frm,to],"ledgerId":item["elementId"],
          "status":status,"weightKg":kg,"actualForceN":actualN,
          "ownerSourceId":item["ownerSourceId"] if status=="OWNED" else None,
          "heldSources":[],"productDifference":cause}
    differences=sorted({e["elementId"] for e in ledger["elements"]}-matching,
                       key=lambda x:int(x[1:]))
    must(len(side)==143 and len(matching)==141 and len(alias_ids)==2 and
         len(differences)==3 and len(extra)==2 and
         set(differences)-alias_ids and
         all(any(e.branch_name==proj["branch"] and
                 e.from_node.node_number==proj["nodePair"][0] and
                 e.to_node.node_number==proj["nodePair"][1] and
                 i not in model.edge_to_rigid_index
                 for i,e in enumerate(model.edges))
             for proj in ledger["elements"] if proj["elementId"] in
             set(differences)-alias_ids),
         "S2R1_5_SOURCE_NATIVE_DIFFERENCES")
    must(Counter(x["status"] for x in side.values())==
         Counter({"OWNED":50,"SUGGESTED":14,"REVIEW":78,"HELD":1}),
         "S2R1_PRODUCT_STATUS_CENSUS")
    # HELD source is a sidecar annotation, not an allocation. Prefer a source
    # tail match to product TO; collapsed-flange head may match product FROM.
    must(byname is not None,"S2R2_HELD_GEOMETRY_SOURCE_REQUIRED")
    allocated=set()
    for source in (s for s in ledger["sources"] if s["status"]=="HELD"):
        ns=binder.nodes(byname[source["branch"]][1])
        a,z=[ns[j] for j in (source["sourceOrdinals"][0],
                             source["sourceOrdinals"][-1])]
        start,end=[tuple(map(float,binder.txt(n,"Position").split()))
                   for n in (a,z)]
        candidates=[]
        for index,edge in enumerate(model.edges):
            if (index not in model.edge_to_rigid_index or
                    edge.branch_name!=source["branch"]):continue
            pointer=model.edge_to_rigid_index[index]
            if side[str(pointer)]["status"] not in ("REVIEW","HELD"):continue
            tail_dist=math.dist(end,edge.to_node.position)
            head_dist=math.dist(start,edge.from_node.position)
            if min(tail_dist,head_dist)<=.01:
                candidates.append((0 if tail_dist<=.01 else 1,pointer))
        must(bool(candidates),"S2R2_HELD_NOT_VISIBLE_IN_PRODUCT")
        pointer=min(candidates)[1]
        must(source["sourceId"] not in allocated,
             "S2R2_HELD_DUPLICATE_SOURCE")
        allocated.add(source["sourceId"])
        side[str(pointer)]["heldSources"].append(
            {"sourceId":source["sourceId"],"kg":source["knownMassKg"]})
    receipt={"schema":"RigidS2R2.NonreleaseNativeCiiSidecar.v2",
      "sourceBasis":basis,"originalR9Sha256":ORIGINAL_SHA,
      "inputSourceSha256":source_hash,
      "ledgerSha256":hashlib.sha256(LEDGER_PATH.read_bytes()).hexdigest(),
      "ciiSha256":hashlib.sha256(cii.encode("utf-8")).hexdigest(),
      "nativeCiiReleaseAuthorized":False,
      "splitGeometryIndependentlyVerified":False,
      "releaseBlocked":True,
      "ciiElementCount":433,"rigidPointerCount":143,
      "unresolvedPointerCount":79,
      "projectedOnlyLedgerIds":differences,
      "nativeOnlyNodePairs":[list(x[1:]) for x in extra],
      "knownSourceKg":1870,"ownedSourceKg":894,"heldSourceKg":976,
      "heldSourceCount":len(allocated),"rigidPointers":side}
    verify_sidecar(cii,receipt)
    return receipt

def render_from_r9(ledger=None,raw=None):
    ledger=load_ledger() if ledger is None else ledger
    if raw is None:raw,basis=source_bytes()
    else:basis=("OWNER_R9_VERIFIED_OFFLINE"
                if hashlib.sha256(raw).hexdigest()==ORIGINAL_SHA
                else "REDACTED_R9_DERIVED_CI")
    _,byname=verify_r9_ledger(ledger,raw)
    verify_held_positions(ledger,byname)
    model,cii,isolated_sha=native_r9_serialization(ledger,raw)
    receipt=verify_product_bytes(ledger,model,cii,basis,hashlib.sha256(raw).hexdigest(),byname)
    receipt["testOnlyStagedSourceSha256"]=isolated_sha
    return cii,receipt

class S2R1NativeR9Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw,_=source_bytes()
        cls.ledger=load_ledger()
        cls.cii,cls.sidecar=render_from_r9(cls.ledger,cls.raw)

    def reject(self,data,code):
        with self.assertRaisesRegex(S2R1Error,code):
            verify_r9_ledger(data,self.raw)

    def test_n1_real_product_path_is_143_and_five_differences(self):
        self.assertEqual(self.sidecar["rigidPointerCount"],143)
        self.assertEqual(self.sidecar["projectedOnlyLedgerIds"],
                         ["E59","E403","E404"])
        self.assertEqual(len(self.sidecar["nativeOnlyNodePairs"]),2)
        self.assertTrue(all("PRODUCT_SHORT_NODE_MERGE_3.2MM" in p["productDifference"]
                            for p in self.sidecar["rigidPointers"].values()
                            if p["productDifference"]))

    def test_n1_corrupted_model_143_census_refused(self):
        model,cii,_=native_r9_serialization(self.ledger,self.raw)
        model.rigid_edges.pop()
        with self.assertRaisesRegex(S2R1Error,"S2R1_REAL_NATIVE_143_RIGID_CENSUS"):
            verify_product_bytes(self.ledger,model,cii,"TEST",hashlib.sha256(self.raw).hexdigest())

    def test_n2_all_zero_forces_have_unresolved_status_sidecar(self):
        self.assertTrue(verify_sidecar(self.cii,self.sidecar))
        self.assertEqual(Counter(p["status"] for p in
                         self.sidecar["rigidPointers"].values()),
                         Counter({"OWNED":50,"SUGGESTED":14,"REVIEW":78,"HELD":1}))

    def test_n2_zero_force_labeled_owned_is_rejected(self):
        bad=copy.deepcopy(self.sidecar)
        next(p for p in bad["rigidPointers"].values()
             if p["status"]=="REVIEW")["status"]="OWNED"
        with self.assertRaisesRegex(S2R1Error,
                                    "S2R1_ZERO_CII_FORCE_REQUIRES_UNRESOLVED_LABEL"):
            verify_sidecar(self.cii,bad)

    def test_n2_sidecar_sha_corruption_is_rejected(self):
        bad=copy.deepcopy(self.sidecar)
        bad["ciiSha256"]="0"*64
        with self.assertRaisesRegex(S2R1Error,"S2R1_SIDECAR_SHA_DRIFT"):
            verify_sidecar(self.cii,bad)

    def test_n2_sidecar_release_authorization_is_rejected(self):
        bad=copy.deepcopy(self.sidecar)
        bad["releaseBlocked"]=False
        with self.assertRaisesRegex(S2R1Error,"S2R1_FINAL_RELEASE_BLOCKED"):
            verify_sidecar(self.cii,bad)

    def test_n3_position_alias_e403_remains_held(self):
        _,byname=decode_source(self.raw)
        self.assertTrue(verify_held_positions(self.ledger,byname))

    def test_n3_dn100_position_match_must_stay_held_named_e403(self):
        bad=copy.deepcopy(self.ledger)
        target=next(s for s in bad["sources"] if s["componentRef"].endswith("/26728"))
        target["holdReason"]="GENERIC_UNSPECIFIED_HELD"
        _,byname=decode_source(self.raw)
        with self.assertRaisesRegex(S2R1Error,"S2R1_DN100_E403_POSITION_HOLD"):
            verify_held_positions(bad,byname)

    def test_d1_sum_preserving_per_component_kg_swap_rejected(self):
        bad=copy.deepcopy(self.ledger)
        for eid,weight in (("E50",16),("E63",14)):
            e=next(p for p in bad["elements"] if p["elementId"]==eid)
            src=next(p for p in bad["sources"] if p["sourceId"]==e["ownerSourceId"])
            e["weightKg"]=weight;src["knownMassKg"]=weight
        self.reject(bad,"S2R1_INDIVIDUAL_R9_KG_DRIFT")

    def test_d2_e9_59kg_moved_to_valve_span_e4_rejected(self):
        bad=copy.deepcopy(self.ledger)
        e4=next(e for e in bad["elements"] if e["elementId"]=="E4")
        e9=next(e for e in bad["elements"] if e["elementId"]=="E9")
        e4.update(status="OWNED",weightKg=59,ownerElementId="E4",
                  ownerSourceId=e9["ownerSourceId"])
        e9.update(status="REVIEW",weightKg=None,ownerElementId=None,
                  ownerSourceId=None)
        self.reject(bad,"S2R1_OWNED_SOURCE_GEOMETRY_DRIFT")

    def test_d3_suggested_e65_borrows_e66_owner_refused(self):
        bad=copy.deepcopy(self.ledger)
        e65=next(e for e in bad["elements"] if e["elementId"]=="E65")
        e66=next(e for e in bad["elements"] if e["elementId"]=="E66")
        e65["ownerSourceId"]=e66["ownerSourceId"]
        self.reject(bad,"S2R1_SUGGESTED_BORROWS_OWNER")

    def test_d4_review_e4_borrows_e9_owner_refused(self):
        bad=copy.deepcopy(self.ledger)
        e4=next(e for e in bad["elements"] if e["elementId"]=="E4")
        e9=next(e for e in bad["elements"] if e["elementId"]=="E9")
        e4["ownerSourceId"]=e9["ownerSourceId"]
        self.reject(bad,"S2R1_REVIEW_BORROWS_OWNER")

    def test_d5_e9_length_147_to_999_rejected(self):
        bad=copy.deepcopy(self.ledger)
        next(e for e in bad["elements"] if e["elementId"]=="E9")["lengthMm"]=999
        self.reject(bad,"S2R1_ORIGINAL_POSITION_LENGTH_DRIFT")

def write_artifacts(folder):
    ledger=load_ledger()
    cii,sidecar=render_from_r9(ledger)
    folder.mkdir(parents=True,exist_ok=True)
    files={
      "S2_R1_NATIVE_ACTUAL_TEST_ONLY.cii":cii.encode("utf-8"),
      "S2_R1_POINTER_STATUS_SIDECAR.json":
         (json.dumps(sidecar,sort_keys=True,indent=2)+"\n").encode("utf-8"),
      "S2_R1_FULL_LEDGER.json":
         (json.dumps(ledger,sort_keys=True,indent=2)+"\n").encode("utf-8")}
    for name,blob in files.items():(folder/name).write_bytes(blob)
    manifest="".join(hashlib.sha256(blob).hexdigest()+"  "+name+"\n"
                     for name,blob in files.items())
    (folder/"SHA256SUMS_S2_R1.txt").write_text(manifest)
    print("S2_R1_TEST_ONLY_EVIDENCE\n"+manifest,flush=True)

if __name__=="__main__":
    if len(sys.argv)==3 and sys.argv[1]=="--write-test-only-dir":
        write_artifacts(Path(sys.argv[2]))
    else:unittest.main()
