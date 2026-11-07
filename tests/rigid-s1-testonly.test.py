"""Rigid S1 14-pair NON-RELEASE actual native CII byte regression + delete-one mutants.

The fixture below is MINIMAL PUBLIC R9-DERIVED GEOMETRY, not the complete R9
source. CI never fetches protected Drive files. Run the CLI separately with
the SHA-verified 687252-byte R9 input for the original-source receipt.
"""
import copy
import json
import math
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'converters'/'scripts'))
from xml229_native_final_mass_binding import (
    NativeMassError, s1_build_test_only_fixture,
    s1_rlt10_length_suggestion, stage_native_original_lineage,
)
from xml229_rigid_s1_testonly import (
    MASTER_ROWS, render_s1_nonrelease, verify_actual_cii, nonrelease_guard,
)

# Branch, source FROM, flange ENTRY, flange EXIT, PCOM ref suffix,
# FLANGE ref suffix, x, route pattern. These are taken from public R9
# source ordinals and geometry, NOT the older 9608d9ad proxy.
PAIR_ROWS=[
 ('P4110005',639,10000,640,24771,24773,109298.00,'P'),
 ('B4110004',749,10010,750,27516,27506,109599.99,'B'),
 ('P4110010',1119,10020,1120,28062,28064,107898.00,'P'),
 ('B4110005',1219,10030,1220,28967,28969,108199.99,'B'),
 ('P4110015',1579,10040,1580,28074,28076,106498.00,'P'),
 ('B4110006',1679,10050,1680,28992,28994,106799.99,'B'),
 ('P4110020',2039,10060,2040,28086,28088,105098.00,'P'),
 ('B4110007',2139,10070,2140,29092,29094,105399.99,'B'),
 ('P4110025',2509,10080,2510,28098,28100,103698.00,'P'),
 ('B4110008',2609,10090,2610,29117,29119,103999.99,'B'),
 ('P4110030',2979,10100,2980,28110,28112,102298.00,'P'),
 ('B4110009',3079,10110,3080,29142,29144,102599.99,'B'),
 ('B4110001',3359,10120,3360,7830,8456,112849.97,'X'),
 ('B4110011',3629,10130,3630,8004,27950,111042.13,'Y'),
]
ROUTE_POS={
 'P':([107731.53]*5,[101819.20,101822.40,101835.10,101838.30,101947.30]),
 'B':([108557.89,108561.09,108573.79,108576.99,108685.99],
      [101774.38,101774.36,101774.30,101774.28,101773.73]),
 'X':([108594.16,108597.36,108610.06,108613.26,108722.26],
      [101415.43,101415.41,101415.35,101415.33,101414.79]),
 'Y':([108559.11,108562.31,108575.01,108578.21,108687.21],
      [101698.80,101698.78,101698.72,101698.70,101698.16]),
}

def derived_source():
    root=ET.Element('PipeStressExport')
    pipe=ET.SubElement(root,'Pipe')
    for i,(section,from_id,flange_id,to_id,pcom_id,flange_ref,x,kind) in enumerate(PAIR_ROWS):
        branch=ET.SubElement(pipe,'Branch')
        ET.SubElement(branch,'Branchname').text=(
            f'/GLRD-1000-2"-{section}-93833-01/B1')
        y,z=ROUTE_POS[kind]
        pos=[f'{x:.2f} {y[j]:.2f} {z[j]:.2f}' for j in range(5)]
        row_types=['VALV','PCOM','PCOM','FLAN','RIGID']
        endpoints=['2','1','2','1','2']
        nums=[from_id,-1,-1,flange_id,to_id]
        refs=[f'134234934/TESTVALVE{i}', f'134234934/{pcom_id}',
              f'134234934/{pcom_id}', f'134234934/{flange_ref}',
              f'134234934/{flange_ref}']
        weights=['47','0','0','15','157.034']
        for j in range(5):
            node=ET.SubElement(branch,'Node')
            fields={
                'NodeNumber':str(nums[j]),'ComponentType':row_types[j],
                'ComponentRefNo':'='+refs[j], 'Endpoint':endpoints[j],
                'Weight':weights[j], 'Position':pos[j],
                'BoreMm':'50.000','Rating':'900',
                'OutsideDiameter':'60.3', 'WallThickness':'3.9116',
            }
            if j in (0,3,4):fields['Rigid']='2'
            if j in (3,4):
                fields['DTXR_POS']='WELDING NECK FLANGE SCH 40S 900+1500#'
                fields['ElementLengthMm']='109.000'
            for k,v in fields.items():
                ET.SubElement(node,k).text=v
    return ET.tostring(root,encoding='utf-8')


class RigidS1ActualCiiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source=derived_source()
        cls.cii,cls.receipt=render_s1_nonrelease(cls.source)

    def test_s1a_pcom_minus1_and_geometry_pass(self):
        checks=self.receipt['checkpoints']
        self.assertEqual(len(checks),14)
        self.assertTrue(all(p['fixturePCOMMinus1Ordinals']==[1,2] for p in checks))
        self.assertTrue(all(abs(p['connectionMm']-19.1)<.03 for p in checks))
        self.assertTrue(all(abs(p['flangeMm']-109)<.03 for p in checks))
        self.assertTrue(self.receipt['actualCiiBytesChecked'])
        # Delete ONE original PCOM source record: the 14-pair source gate RED.
        root=ET.fromstring(self.source)
        first=next(e for e in root.iter() if e.tag=='Branch')
        n=[n for n in first if n.tag=='Node']
        first.remove(n[1])
        with self.assertRaises(NativeMassError) as caught:
            s1_build_test_only_fixture(ET.tostring(root),MASTER_ROWS)
        self.assertEqual(caught.exception.code,'S1_SOURCE_14_PCOM_PAIR_CENSUS')

    def test_s1b_unique_flan_owner_and_duplicate_packet_mutant(self):
        fixture,packet,_=s1_build_test_only_fixture(self.source,MASTER_ROWS)
        self.assertEqual(packet['physicalCount'],14)
        self.assertEqual(len({x['occurrenceId'] for x in packet['components']}),14)
        packet['components'].append(copy.deepcopy(packet['components'][0]))
        packet['physicalCount']+=1
        with TemporaryDirectory() as td:
            src=Path(td)/'source.xml';src.write_bytes(fixture)
            manifest=Path(td)/'packet.json'
            manifest.write_text(json.dumps(packet))
            with self.assertRaises(NativeMassError) as caught:
                stage_native_original_lineage(src,manifest)
            self.assertEqual(caught.exception.code,'NATIVE_OWNER_DUPLICATED')

    def test_s1c_actual_cii_byte_pointer_and_mass_and_deleted_pointer(self):
        rec=copy.deepcopy(self.receipt)
        verified=verify_actual_cii(self.cii,rec)
        self.assertEqual(verified['actualTestCiiElementCount'],28)
        self.assertEqual(verified['actualTestCiiRigidCount'],28)
        self.assertTrue(all(p['actualTestCiiFlangeForceN']==150 for p in
                            verified['checkpoints']))
        self.assertTrue(all(p['actualTestCiiSuggestedForceN']==26.3 for p in
                            verified['checkpoints']))
        lines=self.cii.splitlines()
        j=lines.index('#$ ELEMENTS')+1+12
        lines[j]='0 0 0 0 0 0'  # DELETE one real row-13 RIGID pointer.
        bad='\n'.join(lines)+'\n'
        with self.assertRaises(NativeMassError):
            verify_actual_cii(bad, copy.deepcopy(self.receipt))

    def test_s1d_rlt10_formula_missing_master_and_threshold_mutants(self):
        for p in self.receipt['checkpoints']:
            self.assertEqual(p['status'],'SUGGESTED')
            self.assertEqual(p['weightKg'],2.63)
            self.assertEqual(p['referenceRow']['id'],252)
            self.assertEqual(p['referenceRow']['lengthMm'],109)
            self.assertEqual(p['referenceRow']['weightKg'],15)
        self.assertEqual(s1_rlt10_length_suggestion(
            400,50,900,MASTER_ROWS)['referenceRow']['id'],974)
        self.assertEqual(s1_rlt10_length_suggestion(
            115,50,900,MASTER_ROWS)['status'],'REVIEW')
        missing=tuple(row for row in MASTER_ROWS if row['id']!=252)
        self.assertEqual(s1_rlt10_length_suggestion(
            19.1,50,900,missing)['weightKg'],None)
        with self.assertRaises(NativeMassError) as caught:
            s1_build_test_only_fixture(self.source,missing)
        self.assertEqual(caught.exception.code,
                         'S1_UNKNOWN_REFERENCE_REVIEW_NO_TEST_CII')

    def test_s1e_nonrelease_and_deleted_hold_mutant(self):
        self.assertIs(nonrelease_guard(self.receipt),False)
        self.assertFalse(self.receipt['nativeCiiReleaseAuthorized'])
        wrong=copy.deepcopy(self.receipt)
        wrong['nativeCiiReleaseAuthorized']=True  # DELETE release hold.
        with self.assertRaises(NativeMassError) as caught:
            nonrelease_guard(wrong)
        self.assertEqual(caught.exception.code,'S1_FINAL_RELEASE_BLOCKED')
        # A normal Native Final source packet WITHOUT the explicit test-only
        # quarantine marker must be held before PCOM -1 is pruned.
        fixture, packet, _ = s1_build_test_only_fixture(self.source, MASTER_ROWS)
        packet.pop('s1TestOnlyNonrelease')
        with TemporaryDirectory() as td:
            src=Path(td)/'original.xml';src.write_bytes(fixture)
            manifest=Path(td)/'packet.json'
            manifest.write_text(json.dumps(packet))
            with self.assertRaises(NativeMassError) as denied:
                stage_native_original_lineage(src,manifest)
            self.assertEqual(denied.exception.code,
                'NATIVE_S1_PCOM_UNAPPROVED_RELEASE_BLOCKED')


if __name__=='__main__':
    unittest.main()
