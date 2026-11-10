"""S2-R5: invented-only source/kg custody regression tests; NEVER RELEASE."""
import copy
import importlib.util
from pathlib import Path
import sys
from unittest import mock
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
sys.path.insert(0,str(ROOT/'converters'/'scripts'))
from rigid_s2_r3_synthetic_basis import (
    derive_synthetic_basis, annotate_synthetic_product, locate_rigid_status)

spec=importlib.util.spec_from_file_location('r5_synthetic',
    ROOT/'tests'/'rigid-s2-r2-synthetic.test.py')
s2=importlib.util.module_from_spec(spec)
spec.loader.exec_module(s2)


class S2R5CustodyGuards(unittest.TestCase):
    @staticmethod
    def custody(raw):
        model,cii=s2.product(raw)
        receipt=s2.verify_synthetic(raw,model,cii)
        basis=derive_synthetic_basis(raw)
        owned=[p for p in receipt['rigidPointers'].values()
               if p['status']=='OWNED']
        held=[h for p in receipt['rigidPointers'].values()
              for h in p['heldSources']]
        return model,cii,basis,receipt,owned,held

    def test_z1_baseline_source_kg_conserved(self):
        _,_,basis,_,owned,held=self.custody(s2.synthetic_xml())
        self.assertEqual(sum(x['weightKg'] for x in owned),32)
        self.assertEqual(sum(x['kg'] for x in held),394)
        self.assertEqual(sum(x['weightKg'] for x in owned)+
                         sum(x['kg'] for x in held),426)
        self.assertEqual((len(basis['owners']),len(basis['held'])),(2,2))

    def test_z1_short_gaps_demote_unpaired_owner_to_held(self):
        for gap in (2.9,3.5):
            with self.subTest(short_gap=gap):
                model,cii,basis,receipt,owned,held=self.custody(
                    s2.synthetic_xml(short_gap=gap))
                self.assertEqual(len(model.rigid_edges),6)
                self.assertEqual(sum(p['weightKg'] for p in owned),15)
                self.assertEqual(sum(h['kg'] for h in held),411)
                self.assertEqual(15+411,426)
                owner=next(o for o in basis['owners'] if o['weightKg']==17)
                self.assertEqual(
                    [h for h in held if h['sourceId']==owner['ownerSourceId']],
                    [{'sourceId':owner['ownerSourceId'],'kg':17}])
                row=next(p for p in receipt['rigidPointers'].values()
                         if p['nodePair']==[201,203])
                self.assertEqual(row['status'],'HELD')
                self.assertIsNone(row['weightKg'])
                self.assertEqual(row['actualForceN'],0)

    def test_z1_missing_owner_annotation_fails_source_to_product_bijection(self):
        raw=s2.synthetic_xml(short_gap=2.9)
        model,cii=s2.product(raw)
        owner=next(o for o in derive_synthetic_basis(raw)['owners']
                   if o['weightKg']==17)
        real=s2.annotate_synthetic_product
        def drop_owner(*args):
            side=real(*args)
            for row in side.values():
                row['heldSources']=[h for h in row['heldSources']
                    if h['sourceId']!=owner['ownerSourceId']]
            return side
        with mock.patch.object(s2,'annotate_synthetic_product',
                               side_effect=drop_owner):
            with self.assertRaisesRegex(AssertionError,
                                        'S2R5_SOURCE_KG_EXACT_ONCE_CONSERVATION'):
                s2.verify_synthetic(raw,model,cii)

    def test_z2_duplicate_held_source_id_rejected_by_real_annotator(self):
        raw=s2.synthetic_xml();model,cii=s2.product(raw)
        basis=derive_synthetic_basis(raw)
        basis['held'].append(copy.deepcopy(basis['held'][0]))
        with self.assertRaisesRegex(AssertionError,'S2R3_HELD_SOURCE_INVALID'):
            annotate_synthetic_product(model,cii,basis,s2.binder)

    def test_z2_owner_requires_same_branch_not_colocated_decoy(self):
        raw=s2.synthetic_xml();model,cii=s2.product(raw)
        basis=derive_synthetic_basis(raw)
        owner=next(o for o in basis['owners'] if o['weightKg']==15)
        decoy=copy.deepcopy(owner)
        decoy['branch']='SYNTH-NONOWNER-BRANCH'
        decoy['ownerSourceId']='SYNTH-FALSE-OWNER'
        basis['owners'].insert(0,decoy)
        edge=next(e for idx,e in enumerate(model.edges)
                  if idx in model.edge_to_rigid_index and
                  e.branch_name==owner['branch'] and e.from_node.node_number==102)
        self.assertEqual(locate_rigid_status(edge,basis),
                         ('OWNED',15,owner['ownerSourceId']))

    def test_z2_suggestion_requires_same_branch_not_colocated_decoy(self):
        raw=s2.synthetic_xml();model,cii=s2.product(raw)
        basis=derive_synthetic_basis(raw)
        connection=basis['suggestions'][0]
        decoy=copy.deepcopy(connection)
        decoy['branch']='SYNTH-NONCONNECTION-BRANCH'
        decoy['weightKg']=8.88
        basis['suggestions'].insert(0,decoy)
        edge=next(e for idx,e in enumerate(model.edges)
                  if idx in model.edge_to_rigid_index and
                  e.branch_name==connection['branch'] and
                  e.from_node.node_number==101)
        self.assertEqual(locate_rigid_status(edge,basis),
                         ('SUGGESTED',2.63,None))

    def test_z2_only_flange_held_promotes_review_to_held(self):
        _,_,basis,receipt,_,held=self.custody(s2.synthetic_xml())
        valve=next(h for h in basis['held'] if h['kind']=='VALV')
        flange=next(h for h in basis['held'] if h['kind']=='FLAN')
        rows=list(receipt['rigidPointers'].values())
        valve_row=next(p for p in rows if any(
            h['sourceId']==valve['sourceId'] for h in p['heldSources']))
        flange_row=next(p for p in rows if any(
            h['sourceId']==flange['sourceId'] for h in p['heldSources']))
        self.assertEqual((valve_row['status'],flange_row['status']),
                         ('REVIEW','HELD'))
        self.assertIsNone(valve_row['weightKg'])
        self.assertEqual([h['kg'] for h in held
                          if h['sourceId']==valve['sourceId']],[365])

    def test_z2_rlt10_over_115_without_valve_master_is_review(self):
        raw=s2.synthetic_xml(span_mm=116)
        basis=derive_synthetic_basis(raw)
        self.assertEqual(basis['suggestions'][0]['status'],'REVIEW')
        self.assertIsNone(basis['suggestions'][0]['weightKg'])
        model,cii=s2.product(raw)
        side=s2.verify_synthetic(raw,model,cii)['rigidPointers']
        row=next(p for p in side.values() if p['nodePair']==[101,102])
        self.assertEqual((row['status'],row['weightKg'],row['actualForceN']),
                         ('REVIEW',None,0))


if __name__=='__main__':
    unittest.main()
