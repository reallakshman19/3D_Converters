"""Exact-source pre-Final Datum U and 8 Config NODETYPE native replay."""
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT / 'converters/scripts'))
from xml229_prefinal_restraints import replay_prefinal_restraints, node_type_mutation, kinds

XML = ('<PipeStressExport><Pipe><Branch><Branchname>/TEST/B1</Branchname>'
       '<Node><NodeNumber>140</NodeNumber><NodeName>PS140</NodeName>'
       '<ComponentType>ANCI</ComponentType><Position>0 0 100000</Position>'
       '<OutsideDiameter>88.9</OutsideDiameter><WallThickness>3</WallThickness>'
       '</Node></Branch></Pipe></PipeStressExport>')
JSON = [{'type':'BRANCH','name':'/TEST/B1','children':[{
    'type':'SUPPORT','name':'SUPPORT PS140',
    'attributes':{'POSI':'0 0 0','DTXR':'REST','NAME':'/PS999',
                  'MDSSUPPTYPE':'GT571','SUPPORT_KIND':'REST',
                  'NODETYPE':'17','NODEGAP':'0'}
}]}]


def settings(enabled=True, tolerance=1, mutation=True):
    return {
        'dtxrPositionOffset':{'enabled':enabled,'xOffset':0,'yOffset':0,'zOffset':100000},
        'resolverJsonTrace':{'coordinateTolerance':tolerance},
        'jsonTrace':{'coordinateTolerance':tolerance},
        'inputXmlRestraintTypeMutation':{'enabled':mutation,
            'rows':[{'label':'+Y','from':'17','to':'14'}]},
        'defaultGap':6,
    }


def native(source=JSON, cfg=None):
    data=json.dumps(source).encode('utf8')
    digest=hashlib.sha256(data).hexdigest()
    packet={'originalJsonSha256':digest,'finalizedGeometry':{
        'prefinalRestraints':{'schema':'XML229.PrefinalRestraints.v1',
                              'originalJsonSha256':digest}}}
    with tempfile.TemporaryDirectory() as folder:
        path=Path(folder)/'original-staged.json'
        path.write_bytes(data)
        root=ET.fromstring(XML)
        def require(value,code):
            if not value: raise ValueError(code)
        replay_prefinal_restraints(root,packet,path,cfg or settings(),require)
        return [(r.findtext('Type'),r.findtext('Gap')) for r in root.iter('Restraint')]


class TestXml229DatumAndNodeType(unittest.TestCase):
    def test_selected_datum_and_mutation_result(self):
        self.assertEqual(native(),[('+Y','0.0')])
        self.assertEqual(native(cfg=settings(enabled=False)),[])
        self.assertEqual(native(cfg=settings(mutation=False)),[('17','0.0')])

    def test_shared_coordinate_tolerance(self):
        shifted=json.loads(json.dumps(JSON))
        shifted[0]['children'][0]['attributes']['POSI']='3 0 0'
        self.assertEqual(native(shifted,settings(tolerance=1)),[])
        self.assertEqual(native(shifted,settings(tolerance=4)),[('+Y','0.0')])

    def test_mutation_target_cannot_contradict_support_kind(self):
        cfg=settings()
        cfg['inputXmlRestraintTypeMutation']['rows']=[{'label':'wrong','from':'17','to':'8'}]
        with self.assertRaisesRegex(ValueError,'NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'):
            native(cfg=cfg)

    def test_native_default_mutations_use_native_CII_meanings(self):
        self.assertEqual(node_type_mutation({'NODETYPE':'17'},{}),'+Y')
        self.assertEqual(node_type_mutation({'NODETYPE':'7'},{}),'LIM')
        self.assertEqual(node_type_mutation({'NODETYPE':'10'},{}),'GUI')

    def test_old_saved_gui_mapping_is_blocked(self):
        source=json.loads(json.dumps(JSON))
        attrs=source[0]['children'][0]['attributes']
        attrs['DTXR']='GUIDE'
        attrs['SUPPORT_KIND']='GUIDE'
        attrs['NODETYPE']='10'
        cfg=settings()
        cfg['inputXmlRestraintTypeMutation']['rows']=[{'label':'GUI','from':'10','to':'9'}]
        with self.assertRaisesRegex(ValueError,'NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'):
            native(source,cfg)

    def test_invalid_type_mapping_rejects(self):
        cfg=settings()
        cfg['inputXmlRestraintTypeMutation']['rows']=[{'label':'unsafe','from':'17','to':'99'}]
        with self.assertRaisesRegex(ValueError,'NATIVE_PREFINAL_RESTRAINT_TYPE_INVALID'):
            native(cfg=cfg)


    def test_conflicting_source_type_mutations_reject(self):
        source=json.loads(json.dumps(JSON))
        second=json.loads(json.dumps(source[0]['children'][0]))
        second['attributes']['NODETYPE']='8'
        source[0]['children'].append(second)
        with self.assertRaisesRegex(ValueError,'NATIVE_PREFINAL_RESTRAINT_TYPE_AMBIGUOUS'):
            native(source)


    def test_saved_step7_custom_alias_drives_native_step8(self):
        source=json.loads(json.dumps(JSON))
        attrs=source[0]['children'][0]['attributes']
        attrs['DTXR']='AXIAL LOCK'
        attrs['NODETYPE']='7'
        attrs['NODEGAP']='5.5'
        cfg=settings()
        cfg['supportTypeMapper']={'rows':[
            {'kind':'REST','aliases':['REST','PIPE REST']},
            {'kind':'GUIDE','aliases':['GUIDE','GT']},
            {'kind':'LINESTOP','aliases':['LINE STOP','AXIAL LOCK','ST']},
        ]}
        cfg['inputXmlRestraintTypeMutation']['rows']=[
            {'label':'LIM','from':'7','to':'9'}]
        self.assertEqual(native(source,cfg),[('LIM','5.5')])


    def test_original_1885_rest_type14_beats_coincident_type4_hardware(self):
        source=json.loads((ROOT/'Benchmarks/1885Sjson/Sjson.json').read_text())
        entries=[]
        for branch in source:
            for item in branch.get('children',[]):
                attrs=item.get('attributes') or {}
                if attrs.get('NAME') in ('/PS-12244/DATUM','/PS-12244.1','/PS-12244.2'):
                    entries.append({'attrs':attrs,'desc':attrs.get('DTXR',''),'type':'SUPPORT'})
        self.assertEqual(len(entries),3)
        def require(ok,code):
            if not ok:raise ValueError(code)
        result=kinds(entries,require,settings())
        self.assertEqual(set(result),{'REST'})
        self.assertEqual(result['REST']['NODETYPE'],'14')
        self.assertEqual(result['REST']['NODEGAP'],'0')

    def test_original_firstpass_directional_anchor_on_shoe_is_a_linemit(self):
        source=json.loads((ROOT/'Benchmarks/1885Sjson/Sjson.json').read_text())
        entries=[]
        for branch in source:
            for item in branch.get('children',[]):
                a=item.get('attributes') or {}
                if 'DIRECTIONAL ANCHOR ON SHOE' in str(a.get('DTXR','')).upper():
                    entries.append({'attrs':a,'desc':a.get('DTXR',''),'type':'SUPPORT'})
        self.assertEqual(len(entries),11)
        def require(ok,code):
            if not ok:raise ValueError(code)
        for item in entries:
            result=kinds([item],require,settings())
            self.assertEqual(set(result),{'LINESTOP'})

if __name__=='__main__':
    unittest.main()
