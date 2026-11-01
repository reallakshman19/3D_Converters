"""Synthetic native Python substage receipt tests: no private Owner model is used."""
from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from tempfile import TemporaryDirectory
import re
import shutil
import subprocess
import sys
import unittest
import json
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
SCRIPTS=ROOT/"converters"/"scripts"
sys.path.insert(0,str(SCRIPTS))

import xml_to_cii2019_runtime_custody as runtime
from xml229_native_final_mass_binding import NativeMassError


def fake_args(packet=True):
    return SimpleNamespace(
        input=Path("synthetic.xml"),
        output=Path("never-published.cii"),
        xml229_native_final_packet=Path("synthetic-packet.json") if packet else None,
        xml229_native_mass_proof=Path("not-published-proof.json") if packet else None,
        split_condensed_valve_flange=None,
        staged_json=None,
        support_config_json='{}',
        weight_scale=10,
        diagnostics_out=None,
    )


class NativeSubstageWitnessTests(unittest.TestCase):
    def tearDown(self):
        if hasattr(sys,"_xml229_native_failure_stage"):
            del sys._xml229_native_failure_stage

    def test_typed_native_lineage_exception_preserved_with_substage(self):
        with patch.object(runtime.patched,"_parse_args",return_value=fake_args()),\
             patch.object(runtime.patched,"_load_support_config",return_value={}),\
             patch("xml229_native_final_mass_binding.stage_native_original_lineage",
                   side_effect=NativeMassError("NATIVE_FINALIZED_GEOMETRY_REQUIRED")):
            with self.assertRaises(NativeMassError) as context:
                runtime.main()
        self.assertEqual(context.exception.code,"NATIVE_FINALIZED_GEOMETRY_REQUIRED")
        self.assertEqual(sys._xml229_native_failure_stage,"ORIGINAL_LINEAGE_STAGE")

    def test_unexpected_private_exception_retains_stage_without_suppressing_failure(self):
        private="SECRET_CUSTOMER_PATH /priv/model.xml"
        with patch.object(runtime.patched,"_parse_args",return_value=fake_args(False)),\
             patch.object(runtime.patched,"_load_support_config",return_value={}),\
             patch.object(runtime.patched,"_maybe_enrich_from_staged_json",
                 side_effect=ValueError(private)):
            with self.assertRaisesRegex(ValueError,"SECRET_CUSTOMER_PATH"):
                runtime.main()
        self.assertEqual(sys._xml229_native_failure_stage,"STAGED_ENRICHMENT")

    def test_native_worker_bundle_loads_prefinal_support_mapper(self):
        # Reproduce the fresh Worker import boundary without a full Owner
        # Final packet. This fails on the pre-fix engine.js script list.
        engine_path = ROOT / "converters/xml-cii-2019-standalone/engine.js"
        served_path = ROOT / "docs/converters/xml-cii-2019-standalone/engine.js"
        engine = engine_path.read_text(encoding="utf-8")
        self.assertEqual(engine, served_path.read_text(encoding="utf-8"))
        inventory = engine.split("const SCRIPT_FILE_NAMES = Object.freeze([", 1)[1].split("]);", 1)[0]
        bundled = set(re.findall(r"'([^']+[.]py)'", inventory))
        required = ("xml229_prefinal_restraints.py",
                    "xml229_prefinal_restraint_source.py",
                    "xml229_support_type_mapper.py")
        for filename in required:
            self.assertIn(filename, bundled)
            self.assertEqual((SCRIPTS / filename).read_bytes(),
                             (ROOT / "docs/converters/scripts" / filename).read_bytes())
        with TemporaryDirectory() as work:
            for filename in required[:-1]:
                shutil.copyfile(SCRIPTS / filename, Path(work) / filename)
            command = [sys.executable, "-I", "-c",
                       "import sys; sys.path.insert(0, sys.argv[1]); "
                       "import xml229_prefinal_restraints", work]
            missing = subprocess.run(command, capture_output=True, text=True, timeout=20)
            self.assertNotEqual(missing.returncode, 0)
            self.assertIn("No module named 'xml229_support_type_mapper'", missing.stderr)
            shutil.copyfile(SCRIPTS / required[-1], Path(work) / required[-1])
            resolved = subprocess.run(command, capture_output=True, text=True, timeout=20)
            self.assertEqual(resolved.returncode, 0, resolved.stderr)


    def test_bm2_node_3430_source_bound_dtxr_annotations(self):
        # This uses public authentic BM2 geometry, but SYNTHETIC JSON
        # descriptors/gap to isolate the spelling mismatch without claiming
        # actual Owner support values or native CII engineering approval.
        from xml_to_cii2019_master_addon import (
            _ps_tags_from_text, enrich_xml_addons,
        )
        from xml_to_cii2019_patched import _build_keyword_restraint_specs
        self.assertEqual(_ps_tags_from_text('PS00574.1'), {'PS-00574'})
        self.assertEqual(_ps_tags_from_text('/PS-00574.1'), {'PS-00574'})
        self.assertNotEqual(_ps_tags_from_text('PS00573.1'),
                            _ps_tags_from_text('PS00574.1'))
        xml_path = ROOT / 'Benchmarks/XML-CII-2019/revamped/GLRD-1000-PI-01 - BM2.xml'
        staged = [{
            'type': 'BRANCH',
            'name': '/GLRD-1000-8"-B4110003-13451-01/B1',
            'children': [
                {'type': 'SUPPORT', 'name': '/PS-00574.1',
                 'attributes': {'NAME': '/PS-00574.1',
                    'DTXR': 'GUIDE (NAME=/PS-00574.1,CMPSUPGAP=0mm)'}},
                {'type': 'SUPPORT', 'name': '/PS00574.1',
                 'attributes': {'NAME': '/PS00574.1',
                    'DTXR': 'LINE STOP (NAME=/PS00574.1,CMPSUPGAP=15mm)'}},
            ],
        }]
        result = enrich_xml_addons(xml_path, None, None, json.dumps(staged),
                                   {'enabled': False})
        root = ET.fromstring(result['xmlText'])
        def text(node, name):
            return next((c.text or '' for c in node
                         if c.tag.rsplit('}', 1)[-1] == name), '')
        entries = {text(n, 'NodeNumber'): n for n in root.iter()
                   if n.tag.rsplit('}', 1)[-1] == 'Node'}
        self.assertEqual(text(entries['3430'], 'NodeName'), 'PS00574.1')
        self.assertEqual(text(entries['3420'], 'DTXR_PS'), '')
        annotations = text(entries['3430'], 'DTXR_PS')
        self.assertIn('GUIDE', annotations)
        self.assertIn('LINE STOP', annotations)
        self.assertIn('CMPSUPGAP=15mm', annotations)
        with TemporaryDirectory() as d:
            annotated_path = Path(d) / 'bm2-source-bound-annotated.xml'
            annotated_path.write_text(result['xmlText'], encoding='utf-8')
            specs, _ = _build_keyword_restraint_specs(annotated_path, {})
        self.assertIn(3430, specs)
        self.assertEqual({int(x.type_code) for x in specs[3430]}, {8, 9})
        self.assertEqual(next(x.gap for x in specs[3430]
                              if int(x.type_code) == 9), 15.0)
        # Real gaps and permission to publish CII require the Owner JSON,
        # finalized XML, and independent emitted-CII verification.


    def test_bm2_node3430_pos_without_ps_name_and_member_gap(self):
        """DTXR POS can establish the owner without a JSON PS-name hit."""
        from xml_to_cii2019_master_addon import enrich_xml_addons
        from xml_to_cii2019_patched import _build_keyword_restraint_specs
        source = ROOT / 'Benchmarks/XML-CII-2019/revamped/GLRD-1000-PI-01 - BM2.xml'
        where = '123504.12 114999.98 101330.73'
        staged = [{'type': 'BRANCH',
                   'name': '/GLRD-1000-8"-B4110003-13451-01/B1',
                   'children': [
                       {'type': 'SUPPORT', 'name': 'NO-PS GUIDE',
                        'attributes': {'POSI': where, 'DTXR': 'GUIDE',
                                       'CMPSUPGAP': '0mm'}},
                       {'type': 'SUPPORT', 'name': 'NO-PS LINE STOP',
                        'attributes': {'POSI': where, 'DTXR': 'LINE STOP',
                                       'CMPSUPGAP': '15mm'}},
                       # Same PS as 3430, but at a contradicting XYZ:
                       # NAME alone must not place this third member.
                       {'type': 'SUPPORT', 'name': '/PS-00574.1',
                        'attributes': {'NAME': '/PS-00574.1',
                                       'POSI': '1 2 3', 'DTXR': 'GUIDE'}}]}]
        data = enrich_xml_addons(source, None, None, json.dumps(staged),
                                 {'enabled': False})
        root = ET.fromstring(data['xmlText'])
        def text(node, name):
            return next((c.text or '' for c in node
                         if c.tag.rsplit('}', 1)[-1] == name), '')
        nodes = {text(n, 'NodeNumber'): n for n in root.iter()
                 if n.tag.rsplit('}', 1)[-1] == 'Node'}
        self.assertEqual(text(nodes['3420'], 'DTXR_POS'), '')
        self.assertEqual(text(nodes['3430'], 'DTXR_PS'), '')
        self.assertEqual(text(nodes['3430'], 'NodeName'), 'PS00574.1')
        annotated = text(nodes['3430'], 'DTXR_POS')
        self.assertIn('GUIDE(CMPSUPGAP=0mm)', annotated)
        self.assertIn('LINE STOP(CMPSUPGAP=15mm)', annotated)
        self.assertEqual(data['stats']['dtxrPosAmbiguous'], 0)
        with TemporaryDirectory() as d:
            output = Path(d) / 'bm2-pos-annotated.xml'
            output.write_text(data['xmlText'], encoding='utf-8')
            specs, _ = _build_keyword_restraint_specs(output, {})
        self.assertEqual({int(spec.type_code) for spec in specs[3430]}, {8, 9})
        self.assertEqual(next(spec.gap for spec in specs[3430]
                              if int(spec.type_code) == 9), 15.0)

    def test_bm2_coincident_20_30_requires_second_identity(self):
        """Zero-distance adjacent nodes must not both inherit one JSON member."""
        from xml_to_cii2019_master_addon import enrich_xml_addons
        source = ROOT / 'Benchmarks/XML-CII-2019/revamped/GLRD-1000-PI-01 - BM2.xml'
        pos = '111348.12 107524.90 100916.75'
        source_json = [{'type': 'BRANCH',
                        'name': '/GLRD-1000-6"-P4110001-93833-01/B6',
                        'children': [
                            {'type': 'SUPPORT', 'name': '/PS-00327.1',
                             'attributes': {'NAME': '/PS-00327.1',
                                            'POSI': pos, 'DTXR': 'LINE STOP',
                                            'CMPSUPGAP': '8mm'}},
                            {'type': 'SUPPORT', 'name': 'unowned coincident',
                             'attributes': {'POSI': pos, 'DTXR': 'GUIDE'}}]}]
        data = enrich_xml_addons(source, None, None, json.dumps(source_json),
                                 {'enabled': False})
        root = ET.fromstring(data['xmlText'])
        def at(number):
            return next(n for n in root.iter()
                        if n.tag.rsplit('}', 1)[-1] == 'Node'
                        and next((c.text for c in n
                                  if c.tag.rsplit('}', 1)[-1] == 'NodeNumber'), '') == str(number))
        def dtxr(n):
            return [c.text or '' for c in n if c.tag.rsplit('}', 1)[-1] in ('DTXR_PS', 'DTXR_POS')]
        self.assertEqual(dtxr(at(20)), [])
        self.assertIn('LINE STOP(CMPSUPGAP=8mm)', '|'.join(dtxr(at(30))))
        self.assertNotIn('GUIDE', '|'.join(dtxr(at(30))))
        self.assertEqual(data['stats']['dtxrPosAmbiguous'], 1)

    def test_bm2_calibration_needs_two_independent_position_anchors(self):
        """Source-attested multi-node offsets, never guessed from one tag."""
        from xml_to_cii2019_master_addon import enrich_xml_addons
        source = ROOT / 'Benchmarks/XML-CII-2019/revamped/GLRD-1000-PI-01 - BM2.xml'
        shift = (40000.0, 50000.0, 100000.0)
        source_positions = {
            'PS-00573.1': (117503.96, 114999.98, 101360.73),
            'PS-00574.1': (123504.12, 114999.98, 101330.73),
        }
        children = []
        for name, pos in source_positions.items():
            raw = ' '.join(str(v - off) for v, off in zip(pos, shift))
            children.append({'type': 'SUPPORT', 'name': '/' + name,
                             'attributes': {'NAME': '/' + name, 'POSI': raw,
                                            'DTXR': 'GUIDE'}})
        json_rows = [{'type': 'BRANCH',
                      'name': '/GLRD-1000-8"-B4110003-13451-01/B1',
                      'children': children}]
        data = enrich_xml_addons(source, None, None, json.dumps(json_rows),
                                 {'enabled': True, 'xOffset': 0, 'yOffset': 0,
                                  'zOffset': 0, 'autoCalibrateMinSamples': 2})
        root = ET.fromstring(data['xmlText'])
        def node_field(n, key):
            return next((c.text or '' for c in n
                         if c.tag.rsplit('}', 1)[-1] == key), '')
        matched = {node_field(n, 'NodeNumber'): node_field(n, 'DTXR_POS')
                   for n in root.iter() if n.tag.rsplit('}', 1)[-1] == 'Node'}
        self.assertIn('GUIDE', matched['3420'])
        self.assertIn('GUIDE', matched['3430'])



    def test_bm2_exact_piping_class_bore_wall_reaches_native_cii(self):
        """Independent 93833 row10558, real BM2 OD168.3 -> 7.112mm."""
        import xml_to_cii2019_patched as native
        source = ROOT / 'Benchmarks/XML-CII-2019/revamped/GLRD-1000-PI-01 - BM2.xml'
        spec = json.loads((ROOT / 'docs/Masters/SpecwisePipingClass/93833.json').read_text())
        row = next(r for r in spec['rows'] if r.get('_sourceRowIndex') == 10558)
        self.assertEqual(row['Piping Class'], '93833')
        self.assertEqual(row['convertedBore'], 150)
        self.assertAlmostEqual(float(row['Wall thickness']), 7.112, places=6)
        config = {'pipingClass': {'masterRows': spec['rows']}}
        enriched = native._apply_process_data_to_xml(source, config)
        try:
            root = ET.parse(enriched).getroot()
            branches = [x for x in root.iter() if x.tag.rsplit('}', 1)[-1] == 'Branch']
            def text(n, tag):
                return next((c.text or '' for c in n if c.tag.rsplit('}', 1)[-1] == tag), '')
            first = [n for n in branches[0] if n.tag.rsplit('}', 1)[-1] == 'Node']
            self.assertEqual(text(first[1], 'NodeNumber'), '20')
            self.assertEqual(text(first[1], 'OutsideDiameter'), '168.3')
            self.assertAlmostEqual(float(text(first[1], 'WallThickness')), 7.112, places=6)
            self.assertEqual(text(first[1], 'Weight'), '0')  # no mass authority change
            flange = next(n for n in branches[17] if n.tag.rsplit('}', 1)[-1] == 'Node'
                          and text(n, 'NodeNumber') == '2130')
            self.assertAlmostEqual(float(text(flange, 'WallThickness')), 3.9116, places=5)
            unsupported = next(n for n in branches[28] if n.tag.rsplit('}', 1)[-1] == 'Node')
            self.assertEqual(text(unsupported, 'WallThickness'), '0')  # class13451 not in supplied master
        finally:
            if enriched != source:
                enriched.unlink(missing_ok=True)

        # Use the same source branch/class/OD as real BM2 but a minimal
        # geometry to assert actual serialized CII row2 rather than XML alone.
        name='/GLRD-1000-6"-P4110001-93833-01/B6'
        small=('<PipeStressExport><Pipe><Branch><Branchname>'+name+'</Branchname>'
               '<Temperature><Temperature1>-100000</Temperature1></Temperature>'
               '<Pressure><Pressure1>0</Pressure1></Pressure><MaterialNumber>0</MaterialNumber>'
               '<Node><NodeNumber>10</NodeNumber><Endpoint>1</Endpoint><ComponentType>PIPE</ComponentType>'
               '<Position>0 0 0</Position><OutsideDiameter>168.3</OutsideDiameter>'
               '<WallThickness>0</WallThickness><Weight>0</Weight></Node>'
               '<Node><NodeNumber>20</NodeNumber><Endpoint>2</Endpoint><ComponentType>PIPE</ComponentType>'
               '<Position>100 0 0</Position><OutsideDiameter>168.3</OutsideDiameter>'
               '<WallThickness>0</WallThickness><Weight>0</Weight></Node>'
               '</Branch></Pipe></PipeStressExport>')
        with TemporaryDirectory() as d:
            xml=Path(d)/'source.xml'
            cii=Path(d)/'native.cii'
            xml.write_text(small,encoding='utf-8')
            enriched=native._apply_process_data_to_xml(xml,config)
            run=subprocess.run([sys.executable,str(SCRIPTS/'xml_to_cii2019.py'),
                                '--input',str(enriched),'--output',str(cii)],
                               capture_output=True,text=True,timeout=30)
            self.assertEqual(run.returncode,0,run.stderr)
            emitted=cii.read_text(encoding='utf-8')
            element=emitted.split('#$ ELEMENTS\n',1)[1].split('#$',1)[0].splitlines()
            self.assertEqual((float(element[0].split()[0]),float(element[0].split()[1])),
                             (10,20))
            self.assertAlmostEqual(float(element[1].split()[0]),7.112,places=6)
            if enriched != xml:
                enriched.unlink(missing_ok=True)

    def test_piping_class_conflict_fails_closed_explicit_wall_preserved(self):
        import xml_to_cii2019_patched as native
        rows=[{'Piping Class':'93833','convertedBore':150,'Wall thickness':'7.112'},
              {'Piping Class':'93833','convertedBore':150,'Wall thickness':'12.7'}]
        with self.assertRaisesRegex(ValueError,'XML229_PIPING_CLASS_BORE_AMBIGUOUS'):
            native._source_class_wall_index({'pipingClass':{'masterRows':rows}})
        root=ET.Element('PipeStressExport')
        pipe=ET.SubElement(root,'Pipe')
        branch=ET.SubElement(pipe,'Branch')
        ET.SubElement(branch,'Branchname').text='/GLRD-1000-6"-P4110001-93833-01/B6'
        node=ET.SubElement(branch,'Node')
        ET.SubElement(node,'OutsideDiameter').text='168.3'
        ET.SubElement(node,'WallThickness').text='8.0'
        self.assertFalse(native._apply_source_class_wall(branch,'',{('93833',150):7.112}))
        self.assertEqual(node.findtext('WallThickness'),'8.0')
        self.assertFalse(native._apply_source_class_wall(branch,'',{('93833',50):3.9116}))

    def test_native_json_refreshes_stale_rest_with_verified_position_owner(self):
        import xml_to_cii2019_patched as native
        source = ROOT / 'Benchmarks/XML-CII-2019/revamped/GLRD-1000-PI-01 - BM2.xml'
        with TemporaryDirectory() as folder:
            xml=Path(folder)/'preannotated.xml'
            staged=Path(folder)/'source.json'
            root=ET.parse(source).getroot()
            def field(n,key):
                return next((c for c in n if c.tag.rsplit('}',1)[-1]==key),None)
            target=next(n for n in root.iter() if n.tag.rsplit('}',1)[-1]=='Node'
                        and field(n,'NodeNumber') is not None
                        and field(n,'NodeNumber').text=='3430')
            namespace=target.tag.split('}',1)[0]+'}' if target.tag.startswith('{') else ''
            ET.SubElement(target,namespace+'DTXR_POS').text='REST'
            ET.SubElement(target,namespace+'DTXR_PS').text='REST'
            ET.ElementTree(root).write(xml,encoding='utf-8',xml_declaration=True)
            pos='123504.12 114999.98 101330.73'
            stages=[{'type':'BRANCH','name':'/GLRD-1000-8"-B4110003-13451-01/B1',
                     'children':[{'type':'SUPPORT','name':'Guide from POSI',
                                  'attributes':{'POSI':pos,'DTXR':'GUIDE','CMPSUPGAP':'0mm'}},
                                 {'type':'SUPPORT','name':'Line Stop from POSI',
                                  'attributes':{'POSI':pos,'DTXR':'LINE STOP','CMPSUPGAP':'15mm'}}]}]
            staged.write_text(json.dumps(stages),encoding='utf-8')
            enriched=native._maybe_enrich_from_staged_json(
                xml,staged,{'dtxrPositionOffset':{'enabled':False}})
            new=ET.parse(enriched).getroot()
            final=next(n for n in new.iter() if n.tag.rsplit('}',1)[-1]=='Node'
                       and field(n,'NodeNumber') is not None
                       and field(n,'NodeNumber').text=='3430')
            dtxr=field(final,'DTXR_POS').text
            self.assertIn('GUIDE(CMPSUPGAP=0mm)',dtxr)
            self.assertIn('LINE STOP(CMPSUPGAP=15mm)',dtxr)
            self.assertEqual(field(final,'DTXR_PS').text or '', '')
            specs,_=native._build_keyword_restraint_specs(enriched,{})
            self.assertEqual({int(s.type_code) for s in specs[3430]}, {8,9})
            self.assertEqual(next(s.gap for s in specs[3430]
                                  if int(s.type_code)==9),15.0)

    def test_approved_line_list_mapping_not_overridden_by_heuristic(self):
        import xml_to_cii2019_patched as native
        config={'linelist':{'masterRows':[{
            'lineSeqNo':'4110001','ownerApprovedT1':'120','Temp Max':'777'
        }],'fieldMap':{'lineSeqNo':'lineSeqNo','t1':'ownerApprovedT1'}}}
        native._normalize_process_field_map(config)
        self.assertEqual(config['linelist']['fieldMap']['t1'],'ownerApprovedT1')
        self.assertEqual(native._mapped_process_value('P4110001',config,'t1',
                                                    ['T1','Temp Max']),'120')



    def test_material_rating_93833_and_exact_configured_code_to_cii(self):
        """Real class source + expressly configured map -> CII material slot."""
        import xml_to_cii2019_patched as native
        spec=json.loads((ROOT/'docs/Masters/SpecwisePipingClass/93833.json').read_text())
        source=ROOT/'Benchmarks/XML-CII-2019/revamped/GLRD-1000-PI-01 - BM2.xml'
        cfg={'pipingClass':{'masterRows':spec['rows']},
             'material':{'mapRows':[{'Material':'ASTM A790 UNS S31803','Code':'741'}]}}
        enriched=native._apply_process_data_to_xml(source,cfg)
        try:
            root=ET.parse(enriched).getroot()
            branches=[v for v in root.iter() if v.tag.rsplit('}',1)[-1]=='Branch']
            nodes=[v for v in branches[0] if v.tag.rsplit('}',1)[-1]=='Node']
            def field(n,key):
                return next((x.text or '' for x in n if x.tag.rsplit('}',1)[-1]==key),'')
            self.assertEqual(field(nodes[0],'ComponentType'),'BRAN')
            self.assertEqual(field(nodes[0],'PipingClass'),'93833')
            self.assertEqual(field(nodes[0],'PipingClassRating'),'900')
            self.assertEqual(field(nodes[0],'MaterialName'),'ASTM A790 UNS S31803')
            self.assertEqual(field(nodes[0],'MaterialCode'),'741')
            self.assertEqual(field(nodes[1],'MaterialCode'),'')  # ANCI is not a pipe
        finally:
            if enriched!=source: enriched.unlink(missing_ok=True)
        self.assertEqual(native._material_ids_from_config({
            'material':{'mapRows':[{'Material':'A790-S32803','Code':'338'}]}}),
            {'A790-S32803':338})
        # The bundled S32803 spelling is NOT silently accepted for S31803.
        with TemporaryDirectory() as d:
            original=Path(d)/'one-pipe.xml'; out=Path(d)/'one-pipe.cii'
            original.write_text(
                '<PipeStressExport><Pipe><Branch>'
                '<Branchname>/GLRD-1000-6"-P4110001-93833-01/B6</Branchname>'
                '<Temperature><Temperature1>120</Temperature1></Temperature>'
                '<Pressure><Pressure1>11000</Pressure1></Pressure>'
                '<MaterialNumber>0</MaterialNumber>'
                '<Node><NodeNumber>10</NodeNumber><Endpoint>1</Endpoint>'
                '<ComponentType>BRAN</ComponentType><OutsideDiameter>168.3</OutsideDiameter>'
                '<WallThickness>0</WallThickness><Position>0 0 0</Position></Node>'
                '<Node><NodeNumber>20</NodeNumber><Endpoint>2</Endpoint>'
                '<ComponentType>PIPE</ComponentType><OutsideDiameter>168.3</OutsideDiameter>'
                '<WallThickness>0</WallThickness><Position>100 0 0</Position></Node>'
                '</Branch></Pipe></PipeStressExport>',encoding='utf-8')
            enriched=native._apply_process_data_to_xml(original,cfg)
            command=[sys.executable,str(SCRIPTS/'xml_to_cii2019.py'),
                     '--input',str(enriched),'--output',str(out)]
            result=subprocess.run(command,capture_output=True,text=True,timeout=30)
            self.assertEqual(result.returncode,0,result.stderr)
            data=out.read_text(encoding='utf-8')
            misc=data.split('#'+'$ MISCEL_1',1)[1].split('#'+'$ ',1)[0]
            self.assertEqual(float(misc.splitlines()[1].split()[0]),741)
            if enriched!=original: enriched.unlink(missing_ok=True)

    def test_material_rating_conflict_and_unmapped_alias_do_not_fabricate_ids(self):
        import xml_to_cii2019_patched as native
        row={'Piping Class':'93833','convertedBore':150,'Rating':'900',
             'Material_Name':'ASTM A790 UNS S31803'}
        with self.assertRaisesRegex(ValueError,'XML229_PIPING_CLASS_MATERIAL_RATING_AMBIGUOUS'):
            native._source_class_meta_index({'pipingClass':{'masterRows':[
                row,{**row,'Rating':'600'}]}})
        # A conflict elsewhere in the 10k-row master cannot block a
        # source model that only selected class93833.
        self.assertEqual(native._source_class_meta_index({
            'pipingClass':{'masterRows':[row,{**row,'Piping Class':'99999',
                'Rating':'600'},{**row,'Piping Class':'99999','Rating':'150'}]}},
            {'93833'}),{('93833',150):('ASTM A790 UNS S31803','900')})
        self.assertEqual(native._material_ids_from_config({
            'material':{'mapRows':[{'Material':'ASTM A790 UNS S31803','Code':'741'},
                {'Material':'other','Code':'111'},
                {'Material':'other','Code':'222'}]}},
            {'ASTM A790 UNS S31803'}),{'ASTM A790 UNS S31803':741})
        with self.assertRaisesRegex(ValueError,'XML229_MATERIAL_CODE_AMBIGUOUS'):
            native._material_ids_from_config({'material':{'mapRows':[
                {'Material':'ASTM A790 UNS S31803','Code':'741'},
                {'Material':'ASTM A790 UNS S31803','Code':'742'}]}})
        self.assertNotIn('ASTM A790 UNS S31803',
            native._material_ids_from_config({'material':{'mapRows':[
                {'Material':'A790-S32803','Code':'338'}]}}))
        self.assertEqual(native._material_ids_from_config({
            'material':{'mapRows':[{'Material':'ASTM A790 UNS S31803',
                                    'Code':'A790-S31803'}]}}),{})


    def test_material_scoped_pin_reaches_native_cii_not_class_guess(self):
        """Only a specifically approved Material pin may supply this numeric ID."""
        import xml_to_cii2019_patched as native
        name='ASTM A790 UNS S31803'
        rows=[{'Piping Class':'93833','convertedBore':150,'Material_Name':name,
               'Rating':'900','Wall thickness':'7.112'}]
        config={'pipingClass':{'masterRows':rows},
                'material':{'mapRows':[{'Material':'A790-S32803','Code':'338'}]},
                'overrides':{'materialCode':{'MAT:A790-S31803':'741',
                                             'PC:93833':'999'}}}
        codes=native._material_ids_from_config(config,{name})
        self.assertEqual(codes,{name:741})
        # The custom 741 is a SYNTHETIC explicit owner pin; the default
        # A790-S32803 row cannot silently substitute for S31803.
        small=('<PipeStressExport><Pipe><Branch>'
               '<Branchname>/GLRD-1000-6"-P4110001-93833-01/B6</Branchname>'
               '<Temperature><Temperature1>-100000</Temperature1></Temperature>'
               '<Pressure><Pressure1>0</Pressure1></Pressure>'
               '<Node><NodeNumber>10</NodeNumber><ComponentType>BRAN</ComponentType>'
               '<OutsideDiameter>168.3</OutsideDiameter><WallThickness>0</WallThickness>'
               '<Position>0 0 0</Position></Node>'
               '<Node><NodeNumber>20</NodeNumber><ComponentType>PIPE</ComponentType>'
               '<OutsideDiameter>168.3</OutsideDiameter><WallThickness>0</WallThickness>'
               '<Position>100 0 0</Position></Node>'
               '</Branch></Pipe></PipeStressExport>')
        with TemporaryDirectory() as folder:
            path=Path(folder)/'source.xml'; cii=Path(folder)/'out.cii'
            path.write_text(small,encoding='utf-8')
            enriched=native._apply_process_data_to_xml(path,config)
            try:
                root=ET.parse(enriched).getroot()
                branch=next(root.iter('Branch'))
                first=next(branch.iter('Node'))
                self.assertEqual(first.findtext('MaterialCode'),'741')
                self.assertEqual(first.findtext('PipingClassRating'),'900')
                run=subprocess.run([sys.executable,str(SCRIPTS/'xml_to_cii2019.py'),
                                    '--input',str(enriched),'--output',str(cii)],
                                   capture_output=True,text=True,timeout=30)
                self.assertEqual(run.returncode,0,run.stderr)
                misc=cii.read_text().split('#'+'$ MISCEL_1',1)[1].split('#'+'$ ',1)[0]
                self.assertEqual(float(misc.splitlines()[1].split()[0]),741)
            finally:
                if enriched!=path:enriched.unlink(missing_ok=True)

    def test_material_scoped_pin_conflicts_fail_closed(self):
        import xml_to_cii2019_patched as native
        name='ASTM A790 UNS S31803'
        source={'material':{'mapRows':[{'Material Name':name,'Material Code':'738'}]}}
        self.assertEqual(native._material_ids_from_config(source,{name}),{name:738})
        self.assertEqual(native._material_ids_from_config({
            'overrides':{'materialCode':{'PC:93833':'738','P4110001':'738',
                                         'MAT:A790-S32803':'338'}}},{name}),{})
        conflict={**source,'overrides':{'materialCode':{name:'741'}}}
        with self.assertRaisesRegex(ValueError,'XML229_MATERIAL_PIN_MAP_CONFLICT'):
            native._material_ids_from_config(conflict,{name})
        with self.assertRaisesRegex(ValueError,'XML229_MATERIAL_PIN_INVALID'):
            native._material_ids_from_config({
                'overrides':{'materialCode':{name:'A790-S31803'}}},{name})
        with self.assertRaisesRegex(ValueError,'XML229_MATERIAL_PIN_CONFLICT'):
            native._material_ids_from_config({'overrides':{'materialCode':{
                name:'741','MAT:A790-S31803':'742'}}},{name})



    def test_process_material_higher_authority_than_class_and_native_cii(self):
        import xml_to_cii2019_patched as native
        cfg={'pipingClass':{'masterRows':[{'Piping Class':'93833',
            'convertedBore':150,'Material_Name':'ASTM A790 UNS S31803',
            'Wall thickness':'7.112','Rating':'900'}]},
            'material':{'mapRows':[{'Material Name':'ASTM A106-B','Material Code':'106'},
                                   {'Material Name':'ASTM A790 UNS S31803',
                                    'Material Code':'741'}]},
            'linelist':{'masterRows':[{'lineSeqNo':'4110001','MOC':'ASTM A106-B'}],
                        'fieldMap':{'lineSeqNo':'lineSeqNo','material':'MOC'}}}
        with TemporaryDirectory() as folder:
            path=Path(folder)/'process.xml'; cii=Path(folder)/'process.cii'
            path.write_text('<PipeStressExport><Pipe><Branch>'
                '<Branchname>/GLRD-1000-6"-P4110001-93833-01/B6</Branchname>'
                '<Node><NodeNumber>10</NodeNumber><ComponentType>BRAN</ComponentType>'
                '<OutsideDiameter>168.3</OutsideDiameter><WallThickness>0</WallThickness>'
                '<Position>0 0 0</Position></Node>'
                '<Node><NodeNumber>20</NodeNumber><ComponentType>PIPE</ComponentType>'
                '<OutsideDiameter>168.3</OutsideDiameter><WallThickness>0</WallThickness>'
                '<Position>100 0 0</Position></Node>'
                '</Branch></Pipe></PipeStressExport>',encoding='utf-8')
            enriched=native._apply_process_data_to_xml(path,cfg)
            try:
                root=ET.parse(enriched).getroot()
                pipe=next(root.iter('Node'))
                self.assertEqual(pipe.findtext('MaterialName'),'ASTM A106-B')
                self.assertEqual(pipe.findtext('MaterialCode'),'106')
                self.assertEqual(pipe.findtext('PipingClassRating'),'900')
                run=subprocess.run([sys.executable,str(SCRIPTS/'xml_to_cii2019.py'),
                                    '--input',str(enriched),'--output',str(cii)],
                                   capture_output=True,text=True,timeout=30)
                self.assertEqual(run.returncode,0,run.stderr)
                misc=cii.read_text().split('#'+'$ MISCEL_1',1)[1].split('#'+'$ ',1)[0]
                self.assertEqual(float(misc.splitlines()[1].split()[0]),106)
            finally:
                if enriched!=path:enriched.unlink(missing_ok=True)

    def test_unresolved_nonblank_process_material_blocks_class_guess(self):
        import xml_to_cii2019_patched as native
        name='ASTM A790 UNS S31803'
        cls={'pipingClass':{'masterRows':[{'Piping Class':'93833',
            'convertedBore':150,'Material_Name':name,'Rating':'900'}]},
             'material':{'mapRows':[{'Material':name,'Code':'741'}]}}
        process={**cls,'linelist':{'masterRows':[
            {'lineSeqNo':'4110001','Material':'ASTM A106-B'}]}}
        branch=ET.Element('Branch')
        ET.SubElement(branch,'Branchname').text='/GLRD-1000-6"-P4110001-93833-01/B6'
        node=ET.SubElement(branch,'Node')
        ET.SubElement(node,'ComponentType').text='PIPE'
        ET.SubElement(node,'OutsideDiameter').text='168.3'
        self.assertEqual(native._process_material_for_line('P4110001',process),
                         'ASTM A106-B')
        ids=native._material_ids_from_config(process,{name,'ASTM A106-B'})
        self.assertEqual(ids,{name:741})
        self.assertTrue(native._apply_source_material_rating(
            branch,'',native._source_class_meta_index(process),ids,'ASTM A106-B'))
        # The higher-authority but unmapped process material cannot acquire 741.
        self.assertEqual(node.findtext('MaterialName'),'ASTM A106-B')
        self.assertEqual(node.findtext('PipingClassRating'),'900')
        self.assertIsNone(node.find('MaterialCode'))
        with self.assertRaisesRegex(ValueError,'XML229_LINE_MATERIAL_AMBIGUOUS'):
            native._process_material_for_line('P4110001',{**process,
             'linelist':{'masterRows':[{'lineSeqNo':'4110001','Material':'ASTM A106-B'},
                                      {'lineSeqNo':'4110001','Material':name}]}})


    def test_process_material_conflict_with_existing_source_fails_closed(self):
        import xml_to_cii2019_patched as native
        branch=ET.Element('Branch')
        ET.SubElement(branch,'Branchname').text='/GLRD-1000-6"-P4110001-93833-01/B6'
        node=ET.SubElement(branch,'Node')
        ET.SubElement(node,'ComponentType').text='PIPE'
        ET.SubElement(node,'OutsideDiameter').text='168.3'
        spec={('93833',150):('ASTM A790 UNS S31803','900')}
        codes={'ASTM A106-B':106,'ASTM A790 UNS S31803':741}
        ET.SubElement(node,'MaterialName').text='ASTM A790 UNS S31803'
        with self.assertRaisesRegex(ValueError,'XML229_PROCESS_MATERIAL_NAME_CONFLICT'):
            native._apply_source_material_rating(branch,'',spec,codes,'ASTM A106-B')
        node.find('MaterialName').text='ASTM A106-B'
        ET.SubElement(node,'MaterialCode').text='741'
        with self.assertRaisesRegex(ValueError,'XML229_PROCESS_MATERIAL_CODE_CONFLICT'):
            native._apply_source_material_rating(branch,'',spec,codes,'ASTM A106-B')
        node.find('MaterialCode').text='106'
        self.assertFalse(native._apply_source_material_rating(
            branch,'',spec,codes,'ASTM A106-B'))
        self.assertEqual(node.findtext('MaterialCode'),'106')
        self.assertEqual(node.findtext('MaterialName'),'ASTM A106-B')
        self.assertEqual(node.findtext('PipingClassRating'),'900')

    def test_valve_5950_5960_positive_final_mass_can_be_consumed_when_accepted(self):
        """Synthetic accepted positive kg, with real BM2 valve ref/XYZ witness."""
        from xml229_native_final_mass_binding import bind_native_final_xml,emitted_sections
        import hashlib
        branch='/GLRD-1000-2"-B4110007-93833-01/B1'
        ref='=134234934/29090'
        pos1='105399.99 108189.89 101776.22'
        pos2='105399.99 108557.89 101774.38'
        source=('<PipeStressExport><Pipe><Branch><Branchname>'+branch+'</Branchname>'
                '<Temperature><Temperature1>0</Temperature1></Temperature>'
                '<Pressure><Pressure1>0</Pressure1></Pressure>'
                '<Node><NodeNumber>5950</NodeNumber><ComponentType>VALV</ComponentType>'
                '<ComponentRefNo>'+ref+'</ComponentRefNo><Endpoint>1</Endpoint>'
                '<OutsideDiameter>60.3</OutsideDiameter><WallThickness>3.9116</WallThickness>'
                '<Position>'+pos1+'</Position><Weight>0</Weight></Node>'
                '<Node><NodeNumber>5960</NodeNumber><ComponentType>VALV</ComponentType>'
                '<ComponentRefNo>'+ref+'</ComponentRefNo><Endpoint>2</Endpoint>'
                '<OutsideDiameter>60.3</OutsideDiameter><WallThickness>3.9116</WallThickness>'
                '<Position>'+pos2+'</Position><Rigid>2</Rigid><Weight>0</Weight></Node>'
                '</Branch></Pipe></PipeStressExport>')
        owner=json.dumps(['TEST-VALVE',0,1,
                         json.dumps(['VALV',ref,'2',''],separators=(',',':'))],
                         separators=(',',':'))
        packet={'schema':'XML229.NativeFinalPhysicalPacket.v1',
                'basisId':'a'*64,'finalIntentSha256':'b'*64,
                'sourceId':'TEST-VALVE','sourceXmlSha256':hashlib.sha256(source.encode()).hexdigest(),
                'physicalCount':1,
                'components':[{'occurrenceId':owner,'effectiveKg':2.5}]}
        with TemporaryDirectory() as folder:
            path=Path(folder)/'valve.xml';manifest=Path(folder)/'packet.json'
            output=Path(folder)/'accepted.cii'
            path.write_text(source,encoding='utf-8')
            manifest.write_text(json.dumps(packet),encoding='utf-8')
            enriched,owners=bind_native_final_xml(path,path,manifest)
            try:
                self.assertEqual(owners[0]['kg'],2.5)
                result=subprocess.run([
                    sys.executable,str(SCRIPTS/'xml_to_cii2019.py'),
                    '--input',str(enriched),'--output',str(output),
                    '--weight-scale','10'],capture_output=True,text=True,timeout=30)
                self.assertEqual(result.returncode,0,result.stderr)
                text=output.read_text(encoding='utf-8')
                elem=text.split('#'+'$ ELEMENTS',1)[1].split('#'+'$ ',1)[0].splitlines()
                self.assertEqual(tuple(float(x) for x in elem[1].split()[:2]),(5950.,5960.))
                pointer=int(float(elem[13].split()[1]))
                self.assertGreater(pointer,0)
                slots,weights=emitted_sections(text)
                self.assertIn(pointer-1,slots)
                self.assertEqual(weights[pointer-1],25.0)
            finally:
                if enriched!=path: enriched.unlink(missing_ok=True)


    def test_stage_resets_for_each_new_invocation(self):
        sys._xml229_native_failure_stage="EMITTED_MASS_VERIFY"
        with patch.object(runtime.patched,"_parse_args",side_effect=ValueError("BAD_ARGUMENT")):
            with self.assertRaisesRegex(ValueError,"BAD_ARGUMENT"):
                runtime.main()
        self.assertEqual(sys._xml229_native_failure_stage,"RUNTIME_OPTIONS")


if __name__=="__main__":
    unittest.main()
