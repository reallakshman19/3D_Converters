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
                    "xml229_support_type_mapper.py",
                    "xml_to_cii2019.py")
        for filename in required:
            self.assertIn(filename, bundled)
            self.assertEqual((SCRIPTS / filename).read_bytes(),
                             (ROOT / "docs/converters/scripts" / filename).read_bytes())
        with TemporaryDirectory() as work:
            for filename in required[:2]:
                shutil.copyfile(SCRIPTS / filename, Path(work) / filename)
            command = [sys.executable, "-I", "-c",
                       "import sys; sys.path.insert(0, sys.argv[1]); "
                       "import xml229_prefinal_restraints", work]
            missing = subprocess.run(command, capture_output=True, text=True, timeout=20)
            self.assertNotEqual(missing.returncode, 0)
            self.assertIn("No module named 'xml229_support_type_mapper'", missing.stderr)
            for filename in required[2:]:
                shutil.copyfile(SCRIPTS / filename, Path(work) / filename)
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

    def test_saved_step7_alias_overrides_legacy_word_and_removal_is_respected(self):
        from xml229_prefinal_restraints import kinds
        def require(ok, code):
            if not ok: raise ValueError(code)
        entries=[{'attrs':{'DTXR':'GUIDE','NODETYPE':'17'},'desc':'GUIDE'}]
        custom={'supportTypeMapper':{'rows':[
            {'kind':'REST','aliases':['GUIDE']},
            {'kind':'GUIDE','aliases':['PG','GT']},
            {'kind':'LINESTOP','aliases':['ST']}]}}
        with self.assertRaisesRegex(ValueError,'NATIVE_PREFINAL_RESTRAINT_SEMANTIC_CONFLICT'):
            kinds(entries,require,custom)
        # Uncertain custom text can still be reclassified by the saved mapper.
        entries[0]['attrs']['DTXR']='CUSTOM CLAMP'
        entries[0]['desc']='CUSTOM CLAMP'
        custom['supportTypeMapper']['rows'][0]['aliases']=['CUSTOM CLAMP']
        result=kinds(entries,require,custom)
        self.assertEqual(set(result),{'REST'})
        self.assertEqual(result['REST']['NODETYPE'],'17')
        custom['supportTypeMapper']['rows'][0]['aliases']=[]
        self.assertEqual(kinds(entries,require,custom),{})
        entries[0]['attrs']['DTXR']='GUIDE'
        entries[0]['desc']='GUIDE'
        self.assertEqual(set(kinds(entries,require,{})),{'GUIDE'},
            'unconfigured legacy inputs keep their original semantics')

    def test_saved_step7_conflict_fails_closed_and_step8_mutation_is_authoritative(self):
        from xml229_prefinal_restraints import kinds,node_type_mutation
        def require(ok, code):
            if not ok: raise ValueError(code)
        rows=[{'kind':'REST','aliases':['HOLD POINT']},
              {'kind':'LINESTOP','aliases':['HOLD POINT']}]
        config={'supportTypeMapper':{'rows':rows}}
        entries=[{'attrs':{'DTXR':'HOLD POINT','NODETYPE':'7'},'desc':'HOLD POINT'}]
        with self.assertRaisesRegex(ValueError,'NATIVE_PREFINAL_RESTRAINT_KIND_AMBIGUOUS'):
            kinds(entries,require,config)
        config['supportTypeMapper']['rows']=[{'kind':'ANCHOR','aliases':['HOLD POINT']}]
        with self.assertRaisesRegex(ValueError,'NATIVE_PREFINAL_RESTRAINT_KIND_UNSUPPORTED'):
            kinds(entries,require,config)
        config={'inputXmlRestraintTypeMutation':{'enabled':True,'rows':[
                 {'from':'7','to':'9'},{'from':'7','to':'8'}]}}
        with self.assertRaisesRegex(ValueError,'NATIVE_PREFINAL_RESTRAINT_TYPE_AMBIGUOUS'):
            node_type_mutation({'NODETYPE':'7'},config)
        config['inputXmlRestraintTypeMutation']['rows']=[{'from':'07','to':'GUI'}]
        self.assertEqual(node_type_mutation({'NODETYPE':'7'},config),'GUI')
        config['inputXmlRestraintTypeMutation']['rows'].append({'from':'7','to':'LIM'})
        with self.assertRaisesRegex(ValueError,'NATIVE_PREFINAL_RESTRAINT_TYPE_AMBIGUOUS'):
            node_type_mutation({'NODETYPE':'7'},config)
        config['inputXmlRestraintTypeMutation']['rows']=[{'from':'7','to':'+Y'}]
        self.assertEqual(node_type_mutation({'NODETYPE':'7'},config),'+Y')
        config['inputXmlRestraintTypeMutation']['rows']=[{'from':'7','to':'NONEXISTENT'}]
        with self.assertRaisesRegex(ValueError,'NATIVE_PREFINAL_RESTRAINT_TYPE_INVALID'):
            node_type_mutation({'NODETYPE':'7'},config)
        config['inputXmlRestraintTypeMutation']['enabled']=False
        self.assertEqual(node_type_mutation({'NODETYPE':'7'},config),'7')

    def test_saved_step7_more_specific_alias_outranks_nested_generic_native(self):
        from xml229_support_type_mapper import mapped_support_kind
        def require(condition, code):
            if not condition:
                raise ValueError(code)
        config={'supportTypeMapper':{'rows':[
            {'kind':'REST','aliases':['Shoe']},
            {'kind':'LINESTOP','aliases':['Directional Anchor']},
            {'kind':'ANCHOR','aliases':['Anchor']}]}}
        kind,score=mapped_support_kind(
            {'DTXR':'Directional Anchor On Shoe for Hot Insulated Pipe'},
            '',config,require)
        self.assertEqual(kind,'LINESTOP')
        self.assertGreaterEqual(score,.9)
        # A tie between independent explicit claims MUST still fail closed.
        config['supportTypeMapper']['rows']=[
            {'kind':'REST','aliases':['GUIDE']},
            {'kind':'GUIDE','aliases':['GUIDE']}]
        with self.assertRaisesRegex(ValueError,'NATIVE_PREFINAL_RESTRAINT_KIND_AMBIGUOUS'):
            mapped_support_kind({'DTXR':'GUIDE'},'',config,require)

    def test_saved_step7_mapper_also_controls_patched_native_dtxr_keyword_fallback(self):
        import xml_to_cii2019_patched as native
        config={'supportTypeMapper':{'rows':[
            {'kind':'REST','aliases':['GUIDE']},
            {'kind':'GUIDE','aliases':['PG','GT']},
            {'kind':'LINESTOP','aliases':['ST']}]}}
        self.assertEqual(native._kind_from_dtxr('GUIDE',config),['REST'])
        self.assertEqual(native._kind_from_dtxr(
            'GUIDE(NAME=/PS-4131.1) | ST06(NAME=/PS-4131.2)',config),
            ['REST','LINESTOP'],
            'independent support occurrences must retain both governed CII slots')
        config['supportTypeMapper']['rows'][0]['aliases']=[]
        self.assertEqual(native._kind_from_dtxr('GUIDE',config),[],
            'native CII fallback must not revive a removed Step 7 alias')
        self.assertEqual(native._kind_from_dtxr('GUIDE',{}),['GUIDE'],
            'only unconfigured legacy path may use built-in keywordRules')
        config['supportTypeMapper']['rows']=[
            {'kind':'REST','aliases':['HOLD POINT']},
            {'kind':'LINESTOP','aliases':['HOLD POINT']}]
        with self.assertRaisesRegex(ValueError,'NATIVE_PREFINAL_RESTRAINT_KIND_AMBIGUOUS'):
            native._kind_from_dtxr('HOLD POINT',config)
        config['supportTypeMapper']['rows']=[
            {'kind':'ANCHOR','aliases':['FIXED']}]
        with self.assertRaisesRegex(ValueError,'XML229_CONFIGURED_SUPPORT_KIND_UNSUPPORTED'):
            native._kind_from_dtxr('FIXED',config)

    def test_saved_smart_regex_line_identity_reaches_native_and_rejects_stale_token(self):
        import xml_to_cii2019_patched as native
        branch='/GLRD-1000-6"-P4110001-93833-01/B6'
        fmt={'enabled': True, 'tokenDelimiter': '-',
             'lineKey': {'extractMode': 'TOKEN', 'tokenPosition': 4},
             'pipingClass': {'extractMode': 'TOKEN', 'tokenPosition': 5},
             'rating': {}, 'bore': {'extractMode': 'TOKEN','tokenPosition': 3}}
        cfg={'linelist':{'lineKeyTokenPositions':'4'},
             'regexTester':{'formats':[fmt], 'ratingSequence':[]}}
        self.assertEqual(native._line_key_from_branch(branch,cfg),'P4110001')
        direct={'formats':[fmt], 'linelist':{'lineKeyTokenPositions':'5'}}
        self.assertEqual(native._line_key_from_branch(branch,direct),'P4110001',
                         'root saved formats must override stale legacy token5')
        # Change the saved FORMAT only. A failing regex must not permit the
        # legacy token-position field to keep matching an old master row.
        fmt['lineKey']={'extractMode':'REGEX',
                        'regex':r'-(P9999999)-', 'group':1,
                        'tokenPosition':4}
        with self.assertRaisesRegex(ValueError,'XML229_BRANCH_FORMAT_UNMATCHED'):
            native._line_key_from_branch(branch,cfg)
        fmt['lineKey']['regex']=r'-(P4110001)-'
        self.assertEqual(native._line_key_from_branch(branch,cfg),'P4110001')
        # Conflicting enabled format claims are never first-row-wins.
        conflict={'enabled':True,'tokenDelimiter':'-',
                  'lineKey':{'extractMode':'TOKEN','tokenPosition':5},
                  'pipingClass':{'extractMode':'TOKEN','tokenPosition':5},
                  'rating':{},'bore':{}}
        cfg['regexTester']['formats'].append(conflict)
        with self.assertRaisesRegex(ValueError,'XML229_BRANCH_FORMAT_AMBIGUOUS'):
            native._line_key_from_branch(branch,cfg)
        conflict['enabled']=False
        self.assertEqual(native._line_key_from_branch(branch,cfg),'P4110001')
        cfg['regexTester']['formats']=[]
        with self.assertRaisesRegex(ValueError,'XML229_BRANCH_FORMAT_UNMATCHED'):
            native._line_key_from_branch(branch,cfg)

    def test_real_bm2_combined_line_class_material_to_native_cii(self):
        """Real BM2 field facts serialized through isolated native 10->20; synthetic ID 741."""
        import xml_to_cii2019_patched as native
        from zipfile import ZipFile
        xml=ROOT/'Benchmarks/XML-CII-2019/revamped/GLRD-1000-PI-01 - BM2.xml'
        book=ROOT/'Benchmarks/XML-CII-2019/revamped/LL_BM2.xlsx'
        sheet_ns='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
        with ZipFile(book) as workbook:
            sheet=ET.fromstring(workbook.read('xl/worksheets/sheet3.xml'))
        def cell(ref):
            target=next(n for n in sheet.iter(sheet_ns+'c') if n.get('r')==ref)
            return target.findtext(sheet_ns+'v')
        self.assertEqual((cell('C9'),cell('V9'),cell('K9'),cell('Y9'),cell('Z9')),
                         ('4110001','93833','11000','120','-50'))
        row={'lineSeqNo':cell('C9'),'p1':cell('K9'),'t1':cell('Y9'),
             't2':'40','t3':cell('Z9'),'densityMixed':cell('M9')}
        spec=json.loads((ROOT/'docs/Masters/SpecwisePipingClass/93833.json').read_text())
        cfg={'linelist':{'masterRows':[row], 'fieldMap':{
                'lineSeqNo':'lineSeqNo','p1':'p1','t1':'t1','t2':'t2',
                't3':'t3','densityMixed':'densityMixed'}},
             'pipingClass':{'masterRows':spec['rows']},
             'material':{'mapRows':[{'Material':'ASTM A790 UNS S31803',
                                     'Code':'741'}]}}
        enriched=native._apply_process_data_to_xml(xml,cfg)
        try:
            root=ET.parse(enriched).getroot()
            first=next(n for n in root.iter() if n.tag.rsplit('}',1)[-1]=='Branch')
            nodes=[n for n in first if n.tag.rsplit('}',1)[-1]=='Node']
            def field(n,key):
                return next((x.text or '' for x in n if x.tag.rsplit('}',1)[-1]==key),'')
            self.assertAlmostEqual(float(field(nodes[0],'WallThickness')),7.112,places=6)
            self.assertEqual(field(nodes[0],'PipingClassRating'),'900')
            self.assertEqual(field(nodes[0],'MaterialCode'),'741')
            with TemporaryDirectory() as folder:
                cii=Path(folder)/'bm2-first-element-fields.cii'
                isolated=Path(folder)/'bm2-first-element-fields.xml'
                # Full real BM2 contains multi-restraint nodes which raw
                # xml_to_cii2019.py rejects. This is intentionally ONLY a
                # native field-serialization witness for actual source nodes
                # 10->20; it is NOT a successful full-BM2 production Run.
                projected=ET.Element(root.tag,root.attrib)
                original_pipe=next(n for n in root if n.tag.rsplit('}',1)[-1]=='Pipe')
                pipe=ET.SubElement(projected,original_pipe.tag)
                first_copy=ET.fromstring(ET.tostring(first,encoding='utf-8'))
                seen=0
                for child in list(first_copy):
                    if child.tag.rsplit('}',1)[-1]!='Node':
                        continue
                    seen+=1
                    if seen>2:
                        first_copy.remove(child)
                    else:
                        for annotation in list(child):
                            if annotation.tag.rsplit('}',1)[-1]=='Restraint':
                                child.remove(annotation)
                self.assertEqual(seen,len(nodes))
                pipe.append(first_copy)
                ET.ElementTree(projected).write(isolated,encoding='utf-8',xml_declaration=True)
                # Invoke the production patched elements writer, not the
                # legacy bare converter which intentionally emits only T1.
                run=subprocess.run([sys.executable,str(SCRIPTS/'xml_to_cii2019_patched.py'),
                                    '--input',str(isolated),'--output',str(cii)],
                                   capture_output=True,text=True,timeout=60)
                self.assertEqual(run.returncode,0,run.stderr)
                data=cii.read_text(encoding='utf-8')
                elements=data.split('#'+'$ ELEMENTS\n',1)[1].split('#'+'$ ',1)[0].splitlines()
                self.assertEqual(len(elements)%15,0)
                target=next((i for i in range(len(elements)//15)
                             if '/GLRD-1000-6"-P4110001-93833-01/B6' in elements[i*15+10]
                             and tuple(int(float(x)) for x in elements[i*15].split()[:2])==(10,20)),None)
                self.assertIsNotNone(target,'actual BM2 native 10->20 element absent')
                block=elements[target*15:(target+1)*15]
                self.assertAlmostEqual(float(block[1].split()[0]),7.112,places=5)
                self.assertEqual(float(block[1].split()[3]),120)
                self.assertEqual(float(block[1].split()[5]),-50)
                self.assertEqual(float(block[3].split()[0]),11000)
                # Patched CII default explicitly converts the supplied
                # kg/m3 to kg/cm3; bare legacy converter writes raw density.
                self.assertAlmostEqual(float(block[5].split()[1]),
                                       float(cell('M9')) * 1e-6,places=10)
                material=data.split('#'+'$ MISCEL_1\n',1)[1].split('#'+'$ ',1)[0].splitlines()
                selected=float(material[target//6].split()[target%6])
                self.assertEqual(selected,741)  # synthetic approved pin only
        finally:
            if enriched!=xml:enriched.unlink(missing_ok=True)

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
