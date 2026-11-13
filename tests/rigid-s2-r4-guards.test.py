"""S2-R4 synthetic-only negative geometry and master-ownership witnesses.

Do NOT carry protected R9 data. Real native parser, binder and writer from the
existing synthetic test verify changed geometry independently of source-derived
status/force rules. Guard deletes are tested in an isolated copy.
"""
import copy
import importlib.util
import math
from pathlib import Path
from types import SimpleNamespace
import sys
import unittest
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
sys.path.insert(0,str(ROOT/'converters'/'scripts'))
import xml229_native_final_mass_binding as binder
from rigid_s2_r3_synthetic_basis import derive_synthetic_basis
from rigid_s2_r3_geometry import product_merge_alias, preferred_held_pointer

spec=importlib.util.spec_from_file_location(
    's2r4_synthetic', ROOT/'tests'/'rigid-s2-r2-synthetic.test.py')
s2=importlib.util.module_from_spec(spec)
spec.loader.exec_module(s2)


def mismatched_flange(*, pair_mm=109.0, generic_mm=109.0):
    """Invented source geometry, no mass injected and no protected branch names."""
    root=ET.fromstring(s2.synthetic_xml())
    branches={binder.txt(b,'Branchname'):b for b in binder.branches(root)}
    pair=binder.nodes(branches['SYNTH-LAB-PAIR'])
    merge=binder.nodes(branches['SYNTH-LAB-MERGE'])
    junction=binder.nodes(branches['SYNTH-LAB-MERGE-JUNCTION'])
    def x(n,value):
        coords=list(map(float,binder.txt(n,'Position').split()))
        coords[0]=value
        binder.child(n,'Position').text=' '.join(str(v) for v in coords)
    if pair_mm!=109.0:
        coords=list(map(float,binder.txt(pair[4],'Position').split()))
        coords[2]=10+19.1+pair_mm
        binder.child(pair[4],'Position').text=' '.join(str(v) for v in coords)
        binder.child(pair[3],'ElementLengthMm').text=str(pair_mm)
    if generic_mm!=109.0:
        x(merge[1],600+generic_mm)
        for n in merge[2:]:x(n,600+generic_mm+3.2)
        x(junction[0],600+generic_mm+3.2)
        binder.child(merge[0],'ElementLengthMm').text=str(generic_mm)
        binder.child(merge[1],'ElementLengthMm').text=str(generic_mm)
    return ET.tostring(root,encoding='utf-8',xml_declaration=True)


class S2R4NegativeGuards(unittest.TestCase):
    def unowned_case(self,*,pair_mm=109.0,generic_mm=109.0):
        raw=mismatched_flange(pair_mm=pair_mm,generic_mm=generic_mm)
        basis=derive_synthetic_basis(raw)
        target='SYNTH-LAB-PAIR' if pair_mm!=109 else 'SYNTH-LAB-MERGE'
        self.assertFalse(any(owner['branch']==target for owner in basis['owners']))
        model,cii=s2.product(raw)
        side=s2.verify_synthetic(raw,model,cii)['rigidPointers']
        expected=[102,103] if pair_mm!=109 else [201,203]
        record=next(x for x in side.values() if list(x['nodePair'])==expected)
        self.assertEqual(record['status'],'REVIEW')
        self.assertIsNone(record['weightKg'])
        self.assertEqual(record['actualForceN'],0)

    def test_t1_pcom_flange_19p1_mm_review_null(self):
        self.unowned_case(pair_mm=19.1)

    def test_t1_pcom_flange_76_mm_review_null(self):
        self.unowned_case(pair_mm=76)

    def test_t1_generic_flange_19p1_mm_review_null(self):
        self.unowned_case(generic_mm=19.1)

    def test_t1_generic_flange_76_mm_review_null(self):
        self.unowned_case(generic_mm=76)

    @staticmethod
    def owner():
        return next(o for o in derive_synthetic_basis(s2.synthetic_xml())['owners']
                    if o['weightKg']==17)

    @staticmethod
    def edge(owner,gap=3.2,from_offset=0,branch=None):
        start=list(owner['fromPositionMm'])
        start[0]+=from_offset
        end=list(start)
        end[0]+=owner['lengthMm']+gap
        return SimpleNamespace(branch_name=branch or owner['branch'],
            from_node=SimpleNamespace(position=tuple(start)),
            to_node=SimpleNamespace(position=tuple(end)))

    def test_t2_start_offset_5mm_rejected(self):
        owner=self.owner()
        with self.assertRaisesRegex(AssertionError,'S2R2_PRODUCT_MERGE_NOT_SOURCE_DERIVED'):
            product_merge_alias([owner],self.edge(owner,from_offset=5))

    def test_t2_two_same_branch_sources_rejected(self):
        owner=self.owner();other=copy.deepcopy(owner)
        other['ownerSourceId']='SYNTH-ALTERNATE-SOURCE'
        with self.assertRaisesRegex(AssertionError,'S2R2_PRODUCT_MERGE_NOT_SOURCE_DERIVED'):
            product_merge_alias([owner,other],self.edge(owner))

    def test_t2_cross_branch_colocated_source_rejected(self):
        owner=self.owner();edge=self.edge(owner)
        owner['branch']='SYNTH-OTHER-BRANCH'
        with self.assertRaisesRegex(AssertionError,'S2R2_PRODUCT_MERGE_NOT_SOURCE_DERIVED'):
            product_merge_alias([owner],edge)

    def test_t3_both_merge_window_boundaries(self):
        owner=self.owner()
        for value in (3.0,3.4):
            with self.subTest(accepted=value):
                candidate,delta=product_merge_alias([owner],self.edge(owner,value))
                self.assertIs(candidate,owner)
                self.assertAlmostEqual(delta,value,places=6)
        for value in (2.99,3.41):
            with self.subTest(rejected=value):
                with self.assertRaisesRegex(AssertionError,'S2R2_PRODUCT_MERGE_NOT_SOURCE_DERIVED'):
                    product_merge_alias([owner],self.edge(owner,value))

    @staticmethod
    def decoys():
        def edge(branch,first,last):
            return SimpleNamespace(branch_name=branch,
                from_node=SimpleNamespace(position=first),
                to_node=SimpleNamespace(position=last))
        model=SimpleNamespace(edges=[edge('OTHER',(0,0,0),(10,0,0)),
              edge('TARGET',(20,0,0),(10,0,0))],
              edge_to_rigid_index={0:1,1:2})
        return model,{'1':{'status':'REVIEW'},'2':{'status':'REVIEW'}}

    def test_t3_cross_branch_held_pointer_decoy(self):
        model,side=self.decoys()
        self.assertEqual(preferred_held_pointer('TARGET',(999,0,0),(10,0,0),
                                               model,side),2)

    def test_t3_owned_status_held_pointer_decoy(self):
        model,side=self.decoys()
        model.edges[0].branch_name='TARGET'
        side['1']['status']='OWNED'
        self.assertEqual(preferred_held_pointer('TARGET',(999,0,0),(10,0,0),
                                               model,side),2)

if __name__=='__main__':unittest.main()