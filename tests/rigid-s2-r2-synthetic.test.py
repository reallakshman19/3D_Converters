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
from rigid_s2_r3_synthetic_basis import (
    SYNTH_MASTERS, derive_synthetic_basis, annotate_synthetic_product)
from rigid_s2_r3_geometry import (
    product_merge_alias, preferred_held_pointer, verify_held_source_mapping,
    GeometryWitnessError)
from types import SimpleNamespace
import copy


def synthetic_xml(short_gap=3.2, span_mm=19.1, valve_type="VALV"):
    root=ET.Element('PipeStressExport');pipe=ET.SubElement(root,'Pipe')
    def branch(label,rows,dn=50,rating=900):
        br=ET.SubElement(pipe,'Branch');ET.SubElement(br,'Branchname').text='SYNTH-LAB-'+label
        for num,kind,ref,end,rigid,kg,pos in rows:
            n=ET.SubElement(br,'Node')
            data={'NodeNumber':str(num),'ComponentType':kind,
                  'ComponentRefNo':'=TEST/'+ref,
                  'Endpoint':str(end),'Weight':'0',
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
                   (-1,'PCOM','P1',2,None,0,(10,10,10+span_mm-3.2)),
                   (102,'FLAN','F1',1,2,0,(10,10,10+span_mm)),
                   (103,'RIGID','F1',2,2,0,(10,10,119+span_mm))])
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
                    (502,valve_type,'V5',2,2,0,(2300,50,10)),
                    (503,'RIGID','J5',2,2,0,(2450,50,10))],150)
    return ET.tostring(root,encoding='utf-8',xml_declaration=True)


def product(raw, master_rows=SYNTH_MASTERS):
    """Real S1 native stage/bind/parse/serialize, with independent lab masters."""
    basis=derive_synthetic_basis(raw,master_rows)
    root=ET.fromstring(raw)
    branches=binder.branches(root)
    # No enriched input weights: only derivation from master + source geometry.
    for br in branches:
        for n in binder.nodes(br):
            w=binder.child(n,'Weight')
            if w is not None:
                w.text='0'
    for owner in basis['owners']:
        br=binder.nodes(branches[owner['branchIndex']])
        ni=owner['toIndex']
        binder.child(br[ni],'Weight').text=str(owner['weightKg'])
        # Product's 3.2mm alias is a separate canonical RIGID endpoint.
        for node in br[ni+1:]:
            if binder.txt(node,'ComponentType')=='RIGID':
                gap=math.dist(tuple(map(float,binder.txt(node,'Position').split())),
                              tuple(map(float,binder.txt(br[ni],'Position').split())))
                if 3.0 <= gap <= 3.4:
                    binder.child(node,'Weight').text=str(owner['weightKg'])
    for suggested in basis['suggestions']:
        if suggested['weightKg'] is None:
            continue
        for br in branches:
            if binder.txt(br,'Branchname')!=suggested['branch']:
                continue
            for n in binder.nodes(br):
                if binder.txt(n,'ComponentType')=='FLAN' and (
                    tuple(map(float,binder.txt(n,'Position').split())) ==
                        suggested['toPositionMm']):
                    binder.child(n,'Weight').text=str(suggested['weightKg'])
    isolated=ET.tostring(root,encoding='utf-8',xml_declaration=True)
    components=[]
    source_id='SYNTH-NATIVE-NONRELEASE'
    for owner in basis['owners']:
        bi,ni=owner['branchIndex'],owner['toIndex']
        n=binder.nodes(branches[bi])[ni]
        components.append({
            'occurrenceId':binder._lineage_oid(source_id,bi,ni,n),
            'effectiveKg':owner['weightKg']})
    assert components, 'S2R3_SOURCE_MASTER_HAS_NO_OWNERS'
    packet={'schema':binder.SCHEMA,'sourceId':source_id,
      'sourceXmlSha256':hashlib.sha256(isolated).hexdigest(),
      'basisId':hashlib.sha256(b'SYNTH-BASIS'+isolated).hexdigest(),
      'finalIntentSha256':hashlib.sha256(b'SYNTH-NONRELEASE'+isolated).hexdigest(),
      'physicalCount':len(components),'components':components,
      'nativeCiiReleaseAuthorized':False,'s1TestOnlyNonrelease':True}
    with tempfile.TemporaryDirectory() as td:
        src=Path(td)/'synthetic.xml';src.write_bytes(isolated)
        pkt=Path(td)/'packet.json';pkt.write_text(json.dumps(packet))
        staged=binder.stage_native_original_lineage(src,pkt)
        bound,owners=binder.bind_native_final_xml(
            src,staged,pkt,require_staged_lineage=True)
        assert len(owners)==len(components)
        doc=native._parse_xml_document(
            bound,preserve_rigid_weight_owners=False)
        model=patched._build_conversion_model(doc,{},{},{})
        cii=native._build_cii_text(
            model,'first','SYNTHETIC NONRELEASE',weight_scale=10,support_config={})
    return model,cii


def verify_synthetic(raw,model,cii,master_rows=SYNTH_MASTERS):
    """Independent source/master derivation against real native CII bytes."""
    basis=derive_synthetic_basis(raw,master_rows)
    side=annotate_synthetic_product(model,cii,basis,binder)
    assert len(side)==len(model.rigid_edges)==6, 'SYNTH_SHORT_MERGE_RIGID_CENSUS'
    for i,e in enumerate(model.edges):
        if e.branch_name.endswith('NONRIGID'):
            assert i not in model.edge_to_rigid_index, 'SYNTH_RIGID_FLAN_NOT_RIGID'
    held=[x for p in side.values() for x in p['heldSources']]
    # Independent original-source vs output bijection; a source must be
    # exactly once OWNED or HELD with its original master kg, never omitted.
    expected=[(x['ownerSourceId'],x['weightKg']) for x in basis['owners']]
    expected += [(x['sourceId'],x['knownMassKg']) for x in basis['held']]
    actual=[(p['ownerSourceId'],p['weightKg']) for p in side.values()
            if p['status']=='OWNED']
    actual += [(h['sourceId'],h['kg']) for h in held]
    assert (len(expected)==len(set(x[0] for x in expected)) and
            len(actual)==len(expected) and
            sorted(actual)==sorted(expected) and
            math.isclose(sum(x[1] for x in actual),
                         sum(x[1] for x in expected),abs_tol=1e-9)), (
                'S2R5_SOURCE_KG_EXACT_ONCE_CONSERVATION')
    assert all(p['status'] in ('HELD','REVIEW') and p['weightKg'] is None
               for p in side.values() if p['actualForceN']==0), (
                   'S2R3_UNRESOLVED_NOT_ZERO')
    return {'schema':'RigidS2R3.SyntheticNativeSidecar.v1',
            'releaseBlocked':True,'nativeCiiReleaseAuthorized':False,
            'ciiSha256':hashlib.sha256(cii.encode()).hexdigest(),
            'syntheticSourceSha256':hashlib.sha256(raw).hexdigest(),
            'rigidPointers':side,'heldSourceKg':sum(x['kg'] for x in held),
            'heldSourceCount':len(held)}


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

    def test_p3_held_source_force_tamper_must_be_rejected(self):
        raw=synthetic_xml();model,cii=product(raw)
        lines=cii.splitlines()
        index=lines.index("#$ RIGID")+1+3
        parts=lines[index].split()
        self.assertEqual(len(parts),2)
        parts[0]="290"
        lines[index]=" ".join(parts)
        tampered="\n".join(lines)+"\n"
        with self.assertRaisesRegex(AssertionError,"S2R3_NATIVE_FORCE_SOURCE_DRIFT"):
            verify_synthetic(raw,model,tampered)

    def test_p3_held_and_review_never_claim_mass(self):
        raw=synthetic_xml();model,cii=product(raw)
        receipt=verify_synthetic(raw,model,cii)
        self.assertEqual({p['status'] for p in receipt['rigidPointers'].values()
                          if p['actualForceN']==0},{'REVIEW','HELD'})


    def test_q1_source_xml_has_no_preassigned_mass(self):
        raw=synthetic_xml()
        root=ET.fromstring(raw)
        self.assertTrue(all(binder.txt(n,'Weight')=='0'
            for b in binder.branches(root) for n in binder.nodes(b)))
        self.assertEqual(sum(x['weightKg'] for x in
            derive_synthetic_basis(raw)['owners']),32.0)

    def test_q1_length_40_has_different_suggestion(self):
        raw=synthetic_xml(span_mm=40)
        witness=derive_synthetic_basis(raw)
        suggested=witness['suggestions'][0]
        self.assertEqual(suggested['status'],'SUGGESTED')
        self.assertEqual(suggested['weightKg'],5.50)
        self.assertNotEqual(suggested['weightKg'],2.63)
        model,cii=product(raw)
        receipt=verify_synthetic(raw,model,cii)
        self.assertAlmostEqual(sum(
            x['actualForceN'] for x in receipt['rigidPointers'].values()
            if x['status']=='SUGGESTED'),55.0)

    def test_q1_missing_and_nan_master_are_review_null(self):
        raw=synthetic_xml()
        for rows in (
            tuple(x for x in SYNTH_MASTERS if x['id']!='LAB-F50'),
            tuple(dict(x,**{'RF/RTJ KG':float('nan')})
                  if x['id']=='LAB-F50' else x for x in SYNTH_MASTERS)):
            with self.subTest(rows=repr(rows)):
                model,cii=product(raw,rows)
                receipt=verify_synthetic(raw,model,cii,rows)
                self.assertFalse(any(p['status']=='SUGGESTED' for p in
                                     receipt['rigidPointers'].values()))
                self.assertEqual(sum(p['weightKg'] is None for p in
                    receipt['rigidPointers'].values() if p['actualForceN']==0),
                    sum(p['actualForceN']==0 for p in
                        receipt['rigidPointers'].values()))
                self.assertEqual(len([p for p in receipt['rigidPointers'].values()
                                      if p['status']=='OWNED']),1)

    def test_q1_valve_held_known_mass(self):
        raw=synthetic_xml()
        model,cii=product(raw)
        receipt=verify_synthetic(raw,model,cii)
        held=[x for p in receipt['rigidPointers'].values()
              for x in p['heldSources']]
        self.assertEqual(len(held),2)
        self.assertIn(365,[h['kg'] for h in held])
        self.assertEqual(receipt['heldSourceKg'],394)

    def test_q1_valve_type_tee_rejected(self):
        with self.assertRaisesRegex(AssertionError,'S2R3_VALVE_TYPE_DRIFT'):
            derive_synthetic_basis(synthetic_xml(valve_type='TEE'))

    @staticmethod
    def fake_position_model():
        def node(pos):
            return SimpleNamespace(position=pos)
        edges=[SimpleNamespace(branch_name='LAB-GEOM',
               from_node=node((0,0,0)),to_node=node((10,0,0))),
               SimpleNamespace(branch_name='LAB-GEOM',
               from_node=node((20,0,0)),to_node=node((30,0,0)))]
        return SimpleNamespace(edges=edges,edge_to_rigid_index={0:1,1:2}),{
            '1':{'status':'REVIEW','heldSources':[]},
            '2':{'status':'REVIEW','heldSources':[]}}

    def test_q3_tail_has_priority_over_head(self):
        model,side=self.fake_position_model()
        self.assertEqual(preferred_held_pointer(
            'LAB-GEOM',(20,0,0),(10,0,0),model,side),1)

    def test_q3_head_fallback_accepted(self):
        model,side=self.fake_position_model()
        self.assertEqual(preferred_held_pointer(
            'LAB-GEOM',(20,0,0),(999,0,0),model,side),2)

    def test_q3_not_any_review_pointer_in_branch(self):
        model,side=self.fake_position_model()
        self.assertEqual(preferred_held_pointer(
            'LAB-GEOM',(20,0,0),(30,0,0),model,side),2)

    def test_q3_same_branch_wrong_pointer_is_rejected(self):
        raw=synthetic_xml();basis=derive_synthetic_basis(raw)
        model,cii=product(raw)
        receipt=verify_synthetic(raw,model,cii)
        side=copy.deepcopy(receipt['rigidPointers'])
        valve=next(x for x in basis['held'] if x['kind']=='VALV')
        original=next(k for k,p in side.items() if any(
            h['sourceId']==valve['sourceId'] for h in p['heldSources']))
        alternative=next(k for k,p in side.items()
            if k!=original and model.edges[p['elementIndex']].branch_name==
                valve['branch'] and p['status'] in ('REVIEW','HELD'))
        moved=side[original]['heldSources'].pop()
        side[alternative]['heldSources'].append(moved)
        with self.assertRaisesRegex(AssertionError,
                                    'S2R3_HELD_POINTER_GEOMETRY_DRIFT'):
            verify_held_source_mapping(basis['held'],model,side)

    def test_q4_three_merge_window_points(self):
        owner=next(x for x in derive_synthetic_basis(synthetic_xml())['owners']
                   if x['weightKg']==17)
        def altered(gap):
            to=list(owner['toPositionMm'])
            to[0]+=gap
            return SimpleNamespace(branch_name=owner['branch'],
                from_node=SimpleNamespace(position=owner['fromPositionMm']),
                to_node=SimpleNamespace(position=tuple(to)))
        row,delta=product_merge_alias([owner],altered(3.2))
        self.assertIs(row,owner)
        self.assertAlmostEqual(delta,3.2)
        for gap in (2.9,3.5):
            with self.subTest(gap=gap):
                with self.assertRaisesRegex(AssertionError,
                          'S2R2_PRODUCT_MERGE_NOT_SOURCE_DERIVED'):
                    product_merge_alias([owner],altered(gap))


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
