"""BM3 exact-member ST501 and GT500 classification custody and native parity."""
import sys
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'converters'/'scripts'))
from xml229_prefinal_restraints import kinds, append_profile, mds_kind_conflict


def member(name, func, code, cmp, gap):
    attrs={'NAME':name,'MDSSUPPFUNC':func,'MDSSUPPTYPE':code,
           'CMPSUPTYPE':cmp,'CMPSUPGAP':gap,'NODETYPE':'14','NODEGAP':'0',
           'SUPPORT_KIND':'REST','SUPPORT_MAPPER_KIND':'REST'}
    return {'attrs':attrs,'desc':'','type':'SUPPORT'}


REST=member('/SL-1840203.2.1','PIPE-REST','PIPE-REST','REST','')
AT=member('/SL-1840203.1.1','AT','AT503','SH-A4-3-CS-950-200 / WP-A1-3','')
ST=member('/SL-1840203.1.2','ST','ST501','LS-S2-3','GAP=35mm')
GT=member('/SL-1840203.1.3','GT','GT500','PG-S-3','GAP=10mm')
SOURCE=[REST,AT,ST,GT]
CONFIG={'defaultStiffness':1000,'defaultGap':0,'defaultFriction':0.3}


def require(ok,code):
    if not ok:
        raise ValueError(code)


def receipt(row,kind):
    a=row['attrs']
    return {'memberName':a['NAME'],'kind':kind,'approved':True,
            'approvedBy':'synthetic-regression-owner',
            'evidenceRef':'synthetic-fixture:'+a['MDSSUPPTYPE'],
            'expected':{k:a.get(k,'') for k in ('NAME','NODETYPE','MDSSUPPFUNC',
                                               'MDSSUPPTYPE','CMPSUPTYPE','CMPSUPGAP')}}


class BM3ClassificationTests(unittest.TestCase):
    def test_physical_candidate_is_not_auto_authorized(self):
        self.assertEqual(mds_kind_conflict(ST['attrs'],CONFIG)['candidateKind'],'LINESTOP')
        self.assertEqual(mds_kind_conflict(GT['attrs'],CONFIG)['candidateKind'],'GUIDE')
        with self.assertRaisesRegex(ValueError,'NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'):
            kinds(SOURCE,require,CONFIG)

    def test_approved_exact_source_receipts_replay_separate_rest_gui_lim(self):
        cfg={**CONFIG,'xml229RestraintKindOverrides':[receipt(ST,'LINESTOP'),receipt(GT,'GUIDE')]}
        result=kinds(SOURCE,require,cfg)
        self.assertEqual(set(result),{'REST','GUIDE','LINESTOP'})
        node=ET.fromstring('<Node><NodeNumber>140</NodeNumber></Node>')
        present=set()
        for kind in ('REST','GUIDE','LINESTOP'):
            append_profile(node,kind,result[kind],cfg,present)
        restraints=[(r.findtext('Type'),r.findtext('Gap')) for r in node.findall('Restraint')]
        self.assertIn(('LIM','35.0'),restraints)
        self.assertIn(('GUI','10.0'),restraints)
        self.assertIn(('+Y','0.0'),restraints)

    def test_invalid_approval_or_drift_is_rejected(self):
        cfg={**CONFIG,'xml229RestraintKindOverrides':[receipt(ST,'LINESTOP'),receipt(GT,'GUIDE')]}
        altered=[dict(entry,attrs=dict(entry['attrs'])) for entry in SOURCE]
        altered[2]['attrs']['CMPSUPGAP']='GAP=40mm'
        with self.assertRaisesRegex(ValueError,'NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'):
            kinds(altered,require,cfg)
        bad={**cfg,'xml229RestraintKindOverrides':[
            {**receipt(ST,'LINESTOP'),'evidenceRef':''},receipt(GT,'GUIDE')]}
        with self.assertRaisesRegex(ValueError,'NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'):
            kinds(SOURCE,require,bad)



    def test_att_proposal_never_overrides_original_source_nodetype(self):
        proposed_st={**ST['attrs'],'SOURCE_NODETYPE':'14','NODETYPE':'9'}
        proposed_gt={**GT['attrs'],'SOURCE_NODETYPE':'14','NODETYPE':'8'}
        self.assertEqual(mds_kind_conflict(proposed_st,CONFIG)['sourceKind'],'REST')
        self.assertEqual(mds_kind_conflict(proposed_gt,CONFIG)['sourceKind'],'REST')
        proposed=[REST,AT,{'attrs':proposed_st,'desc':'','type':'SUPPORT'},
                  {'attrs':proposed_gt,'desc':'','type':'SUPPORT'}]
        with self.assertRaisesRegex(ValueError,'NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'):
            kinds(proposed,require,CONFIG)

    def test_gapless_st501_is_rejected_even_with_review_kind_receipt(self):
        gapless={**ST,'attrs':{**ST['attrs'],'CMPSUPGAP':''}}
        source=[REST,AT,gapless,GT]
        cfg={**CONFIG,'xml229RestraintKindOverrides':[
            receipt(gapless,'LINESTOP'),receipt(GT,'GUIDE')]}
        self.assertEqual(mds_kind_conflict(gapless['attrs'],CONFIG)['candidateKind'],'LINESTOP')
        with self.assertRaisesRegex(ValueError,'NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'):
            kinds(source,require,cfg)

if __name__=='__main__':
    unittest.main()
