"""S2-R2: wholly invented SMALL native-path geometry; NO Owner-source facts."""
from pathlib import Path
import hashlib
import json
import math
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'converters'/'scripts'))
import xml229_native_final_mass_binding as binder
import xml_to_cii2019 as native
import xml_to_cii2019_patched as patched


def synthetic_xml(short_gap=3.2):
    root=ET.Element('PipeStressExport');pipe=ET.SubElement(root,'Pipe')
    def branch(label,rows,dn=50,rating=900):
        br=ET.SubElement(pipe,'Branch');ET.SubElement(br,'Branchname').text='SYNTH-LAB-'+label
        for num,kind,ref,end,rigid,kg,pos in rows:
            n=ET.SubElement(br,'Node')
            data={'NodeNumber':str(num),'ComponentType':kind,
                  'ComponentRefNo':'=TEST/'+ref,
                  'Endpoint':str(end),'Weight':str(kg),
                  'Position':' '.join(f'{v:.4f}' for v in pos),
                  'OutsideDiameter':str(dn+10),'WallThickness':'3.2',
                  'BoreMm':str(dn),'Rating':str(rating)}
            if rigid:data['Rigid']=str(rigid)
            if kind=='FLAN':data['ElementLengthMm']='109.000'
            if kind=='RIGID':data['ConnectionType']='BRAN'
            for k,v in data.items():ET.SubElement(n,k).text=v
    # Invented 19.1mm PCOM span followed by distinct 109mm flange, R-LT9/10.
    branch('PAIR',[(101,'VALV','V1',2,2,0,(10,10,10)),
                   (-1,'PCOM','P1',1,None,0,(10,10,13.2)),
                   (-1,'PCOM','P1',2,None,0,(10,10,25.9)),
                   (102,'FLAN','F1',1,2,2.63,(10,10,29.1)),
                   (103,'RIGID','F1',2,2,15,(10,10,138.1))])
    # An invented 3.2mm bridge to a canonical repeated positive junction.
    branch('MERGE',[(201,'FLAN','F2',1,1,0,(600,20,10)),
                    (202,'FLAN','F2',2,2,17,(709,20,10)),
                    (-1,'FBLI','B2',1,None,0,(709+short_gap,20,10)),
                    (-1,'FBLI','B2',2,None,0,(709+short_gap,20,10)),
                    (203,'RIGID','J2',2,2,17,(709+short_gap,20,10))],80)
    # Position-only HELD flange: its two endpoint ids differ from product edge.
    branch('POSITION',[(301,'REDU','R3',2,1,0,(1200,30,10)),
                       (302,'FLAN','F3',1,2,29,(1200,30,10)),
                       (303,'FLAN','F3',2,2,29,(1321,30,10)),
                       (304,'RIGID','J3',2,2,0,(1321+short_gap,30,10))],100)
    # Repeated canonical 203 and 304 are key to the short-element merge.
    branch('MERGE-JUNCTION',[(203,'RIGID','J2',1,2,17,(709+short_gap,20,10)),
                             (205,'ELBO','C2',2,None,0,(900,20,10))],80)
    # Native edge RIGID -> FLAN: not itself an emitted RIGID record.
    branch('NONRIGID',[(304,'RIGID','J4',1,2,0,(1321+short_gap,30,10)),
                       (402,'FLAN','F4',1,2,0,(1321+short_gap,30,10)),
                       (403,'FLAN','F4',2,None,0,(1442+short_gap,30,10))],100,150)
    # Known but unallocated valve crosses two unlike physical boundaries.
    branch('VALVE',[(501,'BRAN','B5',1,1,0,(2100,50,10)),
                    (502,'VALV','V5',2,2,365,(2300,50,10)),
                    (503,'RIGID','J5',2,2,0,(2450,50,10))],150)
    return ET.tostring(root,encoding='utf-8',xml_declaration=True)


def product(raw):
    root=ET.fromstring(raw);branches=binder.branches(root)
    # Stage -> bind -> native XML document parser -> native CII writer.
    owners=[(0,4,15.0),(1,1,17.0)]
    for br in branches:
        for node in binder.nodes(br):
            if binder.txt(node,'Rigid')=='2':
                weight=binder.child(node,'Weight')
                if weight is not None:weight.text='0'
    for bi,ni,kg in owners:
        binder.child(binder.nodes(branches[bi])[ni],'Weight').text=str(kg)
    binder.child(binder.nodes(branches[1])[4],'Weight').text='17'
    binder.child(binder.nodes(branches[0])[3],'Weight').text='2.63'
    isolated=ET.tostring(root,encoding='utf-8',xml_declaration=True)
    components=[];source_id='SYNTH-TEST-ONLY-NO-RELEASE'
    for bi,ni,kg in owners:
        n=binder.nodes(branches[bi])[ni]
        components.append({'occurrenceId':binder._lineage_oid(source_id,bi,ni,n),
                           'effectiveKg':kg})
    packet={'schema':binder.SCHEMA,'sourceId':source_id,
      'sourceXmlSha256':hashlib.sha256(isolated).hexdigest(),
      'basisId':hashlib.sha256(b'SYNTH-BASIS'+isolated).hexdigest(),
      'finalIntentSha256':hashlib.sha256(b'SYNTH-NONRELEASE'+isolated).hexdigest(),
      'physicalCount':len(components),'components':components,
      'nativeCiiReleaseAuthorized':False,'s1TestOnlyNonrelease':True}
    with tempfile.TemporaryDirectory() as td:
        source=Path(td)/'synthetic.xml';source.write_bytes(isolated)
        pkt=Path(td)/'packet.json';pkt.write_text(json.dumps(packet))
        staged=binder.stage_native_original_lineage(source,pkt)
        bound,_=binder.bind_native_final_xml(
            source,staged,pkt,require_staged_lineage=True)
        document=native._parse_xml_document(
            bound,preserve_rigid_weight_owners=False)
        model=patched._build_conversion_model(document,{},{},{})
        cii=native._build_cii_text(
            model,'first','SYNTHETIC NONRELEASE',weight_scale=10,support_config={})
    return model,cii


def verify_synthetic(raw,model,cii):
    """Prove actual row-13 CII pointers and RIGID forces; zero is NOT approved."""
    slots,weights=binder.emitted_sections(cii)
    rows=binder._cii_elements(cii)
    assert len(rows)==len(model.edges), "SYNTH_ELEMENTS_CENSUS"
    assert len(weights)==len(model.rigid_edges)==6, "SYNTH_SHORT_MERGE_RIGID_CENSUS"
    proof={}
    expected={
       'SYNTH-LAB-PAIR':{(101,102):('SUGGESTED',2.63),
                         (102,103):('OWNED',15.0)},
       'SYNTH-LAB-MERGE':{(201,203):('OWNED',17.0)},
       'SYNTH-LAB-POSITION':{(301,304):('HELD',None)},
       'SYNTH-LAB-VALVE':{(501,502):('REVIEW',None),
                          (502,503):('REVIEW',None)}}
    for i,edge in enumerate(model.edges):
        pair=(edge.from_node.node_number,edge.to_node.node_number)
        if edge.branch_name=='SYNTH-LAB-NONRIGID':
            assert i not in model.edge_to_rigid_index, "SYNTH_RIGID_FLAN_NOT_RIGID"
        if i not in model.edge_to_rigid_index:continue
        pointer=model.edge_to_rigid_index[i]
        assert rows[i][2]==pointer and slots[pointer-1][0]==i
        assert pair in expected[edge.branch_name], f'UNMAPPED_SYNTH_PRODUCT_EDGE_{pair}'
        status,kg=expected[edge.branch_name][pair]
        force=weights[pointer-1]
        if kg is None:assert force==0.0
        else:assert math.isclose(force,10*kg,abs_tol=1e-6)
        held=([{'sourceId':'SYNTH-HELD-FLAN-F3','kg':29}]
              if edge.branch_name=='SYNTH-LAB-POSITION' else
              [{'sourceId':'SYNTH-HELD-VALVE-V5','kg':365}]
              if edge.branch_name=='SYNTH-LAB-VALVE' and pair==(501,502)
              else [])
        proof[str(pointer)]={'pointer':pointer,'elementIndex':i,
            'status':status,'weightKg':kg,'actualForceN':force,
            'nodePair':pair,
            'ownerSourceId':'SYNTH/OWNED' if status=='OWNED' else None,
            'heldSources':held}
    assert len(proof)==6 and all(x in proof for x in map(str,range(1,7)))
    held=[h for v in proof.values() for h in v['heldSources']]
    assert len(held)==len({x['sourceId'] for x in held})==2
    assert sum(x['kg'] for x in held)==394
    assert all(v['status'] in ('HELD','REVIEW') and v['weightKg'] is None
               for v in proof.values() if v['actualForceN']==0)
    return {'schema':'RigidS2R2.SyntheticNativeSidecar.v1',
            'releaseBlocked':True,'nativeCiiReleaseAuthorized':False,
            'ciiSha256':hashlib.sha256(cii.encode()).hexdigest(),
            'syntheticSourceSha256':hashlib.sha256(raw).hexdigest(),
            'rigidPointers':proof,'heldSourceKg':394,'heldSourceCount':2}


class SyntheticNativeProofTests(unittest.TestCase):
    def test_p1_synthetic_fixture_covers_all_six_rules(self):
        raw=synthetic_xml();model,cii=product(raw)
        receipt=verify_synthetic(raw,model,cii)
        self.assertLess(len(raw),12000)
        self.assertEqual(len(model.rigid_edges),6)
        self.assertEqual(len(receipt['rigidPointers']),6)
        self.assertEqual(sum(x['actualForceN'] for x in receipt['rigidPointers'].values()
                             if x['status']=='SUGGESTED'),26.3)
        self.assertEqual(sum(x['actualForceN'] for x in receipt['rigidPointers'].values()
                             if x['status']=='OWNED'),320)
        self.assertEqual(receipt['heldSourceKg'],394)
        self.assertFalse(receipt['nativeCiiReleaseAuthorized'])

    def test_p4_3_2mm_canonical_merge_mutation_red(self):
        raw=synthetic_xml(short_gap=9.2)
        model,cii=product(raw)
        with self.assertRaisesRegex(
                AssertionError,
                'SYNTH_SHORT_MERGE_RIGID_CENSUS|UNMAPPED_SYNTH_PRODUCT_EDGE'):
            verify_synthetic(raw,model,cii)

    def test_p3_held_and_review_never_claim_mass(self):
        raw=synthetic_xml();model,cii=product(raw)
        receipt=verify_synthetic(raw,model,cii)
        self.assertEqual({p['status'] for p in receipt['rigidPointers'].values()
                          if p['actualForceN']==0},{'REVIEW','HELD'})


def write_artifacts(folder):
    raw=synthetic_xml();model,cii=product(raw)
    sidecar=verify_synthetic(raw,model,cii)
    folder.mkdir(parents=True,exist_ok=True)
    files={'S2_R2_SYNTHETIC_SOURCE.xml':raw,
          'S2_R2_SYNTHETIC_NATIVE_TEST_ONLY.cii':cii.encode(),
          'S2_R2_SYNTHETIC_POINTER_STATUS.json':
              (json.dumps(sidecar,indent=2,sort_keys=True)+'\n').encode()}
    for name,data in files.items():(folder/name).write_bytes(data)
    manifest=''.join(hashlib.sha256(data).hexdigest()+'  '+name+'\n'
                     for name,data in files.items())
    (folder/'SHA256SUMS_SYNTHETIC.txt').write_text(manifest)
    print('S2_R2_SYNTHETIC_FIXTURE_BYTES',len(raw),
          'PRODUCT_RIGID_COUNT',len(model.rigid_edges),flush=True)
    print(manifest,flush=True)


if __name__=='__main__':
    if len(sys.argv)==3 and sys.argv[1]=='--write-test-only-dir':
        write_artifacts(Path(sys.argv[2]))
    else:
        unittest.main()
