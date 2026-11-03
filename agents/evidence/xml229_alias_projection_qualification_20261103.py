"""Pinned, scratch-only EF alias differential; no production repair or acceptance."""
from pathlib import Path
from dataclasses import asdict
import collections
import copy
import hashlib
import importlib
import json
import subprocess
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
PIN = '5c39dd7bdbb7f2f63a686823b72bdb81909d52af'
SCRATCH = ROOT / '.local-test-tmp/xml229-a3-alias-proof-20261103'
NATIVE = ROOT / '.local-test-tmp/xml229-patch-qualification-20261102/native-tree/converters/scripts'
FIXTURE = 'Benchmarks/EF-05-PRO.TEST.xml'
EXPECTED_SHA = '2573883480af904096dea2663c9cf585be2db28dd047785397b4d61edee0a030'
BRANCH = '/ASIM-1836-8"-P8810021-31441C4-PP/B4'
CHECKS = []


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def blob(path):
    return subprocess.check_output(['git', 'cat-file', 'blob', f'{PIN}:{path}'], cwd=ROOT)


def check(name, value, observation, oracle):
    CHECKS.append(dict(id=name, status='PASS' if value else 'FAIL',
                       observation=observation, oracle=oracle))


def nodes(branch):
    return branch.findall('{*}Node')


def text(element, field):
    return element.findtext('{*}' + field, '').strip()


def project(source, relocate=False):
    target = copy.deepcopy(source)
    branch = target.findall('.//{*}Branch')[0]
    carrier, alias = nodes(branch)[7:9]
    if relocate:
        for member in alias.findall('{*}Restraint'):
            carrier.append(copy.deepcopy(member))
    branch.remove(alias)
    return target


def save_model(base, root, name):
    path = SCRATCH / (name + '.xml')
    ET.ElementTree(root).write(path, encoding='utf-8', xml_declaration=True)
    document = base._parse_xml_document(path, preserve_finalized_geometry=True)
    return base._build_conversion_model(document)


def canonical_number(value):
    return 50 if value == 60 else value


def property_view(edge):
    result = asdict(edge)
    for side in ('from_node', 'to_node'):
        node = result[side]
        # These identities are checked separately, never silently discarded.
        for key in ('node_number', 'node_name', 'component_ref_no'):
            del node[key]
    return result


def edge_key(edge):
    return [edge.branch_name, canonical_number(edge.from_node.node_number),
            canonical_number(edge.to_node.node_number)]


def auxiliary_checks(base, before, after, kept, old_lines, new_lines):
    maps = [('edge_to_bend_index', 'bend_edges', 12, 0),
            ('edge_to_rigid_index', 'rigid_edges', 12, 1),
            ('edge_to_sif_index', 'sif_edges', 13, 4),
            ('edge_to_reducer_index', 'reducer_edges', 14, 0)]
    deltas = []
    for j, i in enumerate(kept):
        for mapping, target, row, col in maps:
            a, b = getattr(before, mapping).get(i, 0), getattr(after, mapping).get(j, 0)
            if int(old_lines[i*15+row].split()[col]) != a or int(new_lines[j*15+row].split()[col]) != b:
                deltas.append([j, mapping, 'wrong serialized pointer'])
            if a and b:
                x, y = getattr(before, target)[a-1], getattr(after, target)[b-1]
                if property_view(x) != property_view(y) or edge_key(x) != edge_key(y):
                    deltas.append([j, mapping, 'changed target'])
            elif bool(a) != bool(b):
                deltas.append([j, mapping, 'lost target'])
        a, b = before.edge_to_restraint_index.get(i, 0), after.edge_to_restraint_index.get(j, 0)
        if bool(a) != bool(b) or (a and asdict(before.restraints[a-1]) != asdict(after.restraints[b-1])):
            deltas.append([j, 'RESTRANT', 'changed assigned member/profile'])
        if int(old_lines[i*15+12].split()[3]) != a or int(new_lines[j*15+12].split()[3]) != b:
            deltas.append([j, 'RESTRANT', 'wrong serialized pointer'])
    check('actual_auxiliary_reference_targets', not deltas,
          dict(comparedElements=len(kept), deltas=deltas, restraintAuxBefore=len(before.restraints),
               restraintAuxAfter=len(after.restraints), nodename='Identity delta is separately reported as preservation FAIL.'),
          'Actual serialized pointer values and complete before/after model targets; implementation-coupled differential')
    old, new = base._build_rigid_payload(before, 10), base._build_rigid_payload(after, 10)
    check('source_weight_rigid_payload', old == new,
          dict(equal=old == new, rowsBefore=len(old), rowsAfter=len(new), scale=10,
               acceptedFinal='NOT_RUN: raw source weights only'),
          'Actual unchanged base RIGID writer on source-weight models; not accepted mass verification')


def structural_checks(base, patched, original, projected):
    before, after = save_model(base, original, 'original'), save_model(base, projected, 'projected')
    kept = [i for i, e in enumerate(before.edges) if not
            (e.branch_name == BRANCH and e.from_node.node_number == 50 and e.to_node.node_number == 60)]
    pairs = [(before.edges[i], e) for i, e in zip(kept, after.edges)]
    property_deltas = [edge_key(b) for a, b in pairs if property_view(a) != property_view(b)]
    identity_deltas = [dict(edge=edge_key(b), before=[a.from_node.node_name, a.from_node.component_ref_no],
                           after=[b.from_node.node_name, b.from_node.component_ref_no])
                       for a, b in pairs if (a.from_node.node_name, a.from_node.component_ref_no) !=
                       (b.from_node.node_name, b.from_node.component_ref_no)]
    check('native_non_alias_edge_order_and_properties', len(kept) == len(after.edges) and
          all(edge_key(a) == edge_key(b) for a, b in pairs) and not property_deltas,
          dict(beforeEdges=len(before.edges), afterEdges=len(after.edges),
               comparedNonAliasEdges=len(pairs), propertyDeltas=property_deltas),
          'Differential native parser/model; implementation-coupled property preservation, not independent physical equivalence')
    check('one_zero_edge_removed', len(before.edges) == len(after.edges) + 1 and
          before.edges[[i for i in range(len(before.edges)) if i not in kept][0]].from_node.position ==
          before.edges[[i for i in range(len(before.edges)) if i not in kept][0]].to_node.position,
          'Exactly EF50-to60 is omitted; canonical numbers do not create a self edge.',
          'Fixed original source ordinals and explicit edge expectation')
    write = patched._patched_elements_payload_factory({}, {}, {}, {}, {})
    old_lines, new_lines = write(before), write(after)
    core_deltas = []
    for j, old_index in enumerate(kept):
        old, new = old_lines[old_index*15:(old_index+1)*15], new_lines[j*15:(j+1)*15]
        a, b = old[0].split(), new[0].split()
        if [canonical_number(int(float(v))) for v in a[:2]] != [int(float(v)) for v in b[:2]] or a[2:] != b[2:] or old[1:12] != new[1:12]:
            core_deltas.append(j)
    check('actual_patched_element_core', not core_deltas and len(new_lines) == len(after.edges)*15,
          dict(comparedBlocks=len(pairs), rowsPerBlock=15, physicalRowsCompared=12, deltas=core_deltas,
               excludedRows='Rows13-15 are auxiliary indices; semantic targets checked separately.'),
          'Actual unchanged patched formatter differential; not an independently authored numerical oracle')
    aux_maps = ['edge_to_bend_index', 'edge_to_rigid_index', 'edge_to_sif_index', 'edge_to_reducer_index']
    aux_deltas = []
    for j, i in enumerate(kept):
        for name in aux_maps:
            if bool(getattr(before, name).get(i)) != bool(getattr(after, name).get(j)):
                aux_deltas.append([j, name])
    check('native_component_auxiliary_roles', not aux_deltas and len(before.rigid_edges) == len(after.rigid_edges),
          dict(deltas=aux_deltas, rigidEdgesBefore=len(before.rigid_edges), rigidEdgesAfter=len(after.rigid_edges)),
          'Existing model classifications; does not supply an accepted Final mass packet')
    auxiliary_checks(base, before, after, kept, old_lines, new_lines)
    before_labels = [s for s in before.nodename_lines if 'PS-14167/SREF' in s]
    after_labels = [s for s in after.nodename_lines if 'PS-14167/SREF' in s]
    check('naive_projection_identity_loss_detected', len(identity_deltas) == 1 and bool(before_labels) and not after_labels,
          dict(identityDeltas=identity_deltas, srefLabelRecordsBefore=len(before_labels),
               srefLabelRecordsAfter=len(after_labels), preservationStatus='FAIL',
               interpretation='Numerical properties match, but edge-facing identity and NODENAME change. No adopted alias policy authorizes ignoring this.'),
          'Literal original SREF/ComponentRefNo and actual native NODENAME records')
    return dict(beforeEdges=len(before.edges), afterEdges=len(after.edges),
                nativePositiveNodesBefore=sum(len(b.nodes) for b in base._parse_xml_document(SCRATCH/'original.xml', preserve_finalized_geometry=True).branches),
                identityDeltas=identity_deltas)


def source_checks(original, projected):
    branches = original.findall('.//{*}Branch')
    selected = nodes(branches[0])[7:9]
    identities = {text(n, field) for n in selected for field in ('NodeName', 'ComponentRefNo')}
    scalar_hits = []
    for bi, branch in enumerate(branches):
        for ni, node in enumerate(nodes(branch)):
            for child in node:
                value = (child.text or '').strip()
                if any(identity in value for identity in identities):
                    scalar_hits.append([bi, ni, child.tag.rsplit('}', 1)[-1], value])
    number_hits = [[bi, ni, text(n, 'NodeNumber')] for bi, b in enumerate(branches)
                   for ni, n in enumerate(nodes(b)) if text(n, 'NodeNumber') in ('50', '60')]
    check('bounded_source_references', len(scalar_hits) == 4 and number_hits == [[0, 7, '50'], [0, 8, '60']]
          and all(row[0] == 0 and row[1] in (7, 8) and row[2] in ('NodeName', 'ComponentRefNo') for row in scalar_hits),
          dict(exactPositiveIdOccurrences=number_hits, fullNameOrRefStringHits=scalar_hits,
               scope='This exact original XML only. No generic embedded-reference grammar or JSON/config correspondence inferred.'),
          'Independent original XML traversal, no production imports')
    surviving = []
    for bi, (old, new) in enumerate(zip(branches, projected.findall('.//{*}Branch'))):
        expected = [n for ni, n in enumerate(nodes(old)) if (bi, ni) != (0, 8)]
        surviving.extend(ET.tostring(a) == ET.tostring(b) for a, b in zip(expected, nodes(new)))
        assert len(expected) == len(nodes(new))
    check('retained_xml_and_mass_fields_unchanged', len(surviving) == 1653 and all(surviving),
          dict(retainedOriginalNodes=len(surviving), aliasWeight=text(selected[1], 'Weight'),
               aliasRigid=text(selected[1], 'Rigid'), aliasAuthoredMembers=len(selected[1].findall('{*}Restraint')),
               acceptedFinalPacket='NOT_AVAILABLE_NOT_RUN'),
          'Independent whole-retained-node XML comparison; accepted mass decisions are not inferred from source Weight')
    witness = dict(sourceSha256=EXPECTED_SHA, carrierOriginalOrdinal=[0, 7], absorbedOriginalOrdinal=[0, 8],
                   originalAliasXml=[ET.tostring(n, encoding='unicode') for n in selected],
                   status='SCRATCH_WITNESS_NOT_ADOPTED_CONTRACT')
    (SCRATCH/'source-alias-witness.json').write_text(json.dumps(witness, indent=2)+'\n', encoding='utf-8')
    return witness


def add_members(source, count):
    result = copy.deepcopy(source)
    pair = nodes(result.findall('.//{*}Branch')[0])[7:9]
    for i in range(count):
        node = pair[0 if i == 0 else 1]
        ns = node.tag.rsplit('}', 1)[0] + '}' if '}' in node.tag else ''
        member = ET.SubElement(node, ns+'Restraint')
        for field, value in [('Type', '+Y'), ('Stiffness', '1751270000000'), ('Gap', str(i)), ('Friction', '0.3')]:
            ET.SubElement(member, ns+field).text = value
    return result


def member_checks(base, original):
    cases = []
    for count in range(1, 7):
        authored = add_members(original, count)
        model = save_model(base, project(authored, relocate=True), f'members-{count}-relocated')
        assigned = [r for r in model.restraints if r.node_number == 50]
        payload = base._build_restraint_payload(model)
        index = next(i for i, r in enumerate(model.restraints) if r.node_number == 50)
        slots = [[float(v) for v in payload[index*24+i*4].split()[:5]] for i in range(count)]
        expected = [[50.0, 14.0, 1751270000000.0, float(i), 0.3] for i in range(count)]
        cases.append(dict(count=count, status='PASS' if len(assigned) == 1 and slots == expected else 'FAIL',
                          actualSlots=slots, expectedSlots=expected))
    check('one_to_six_same_type_authored_members', all(c['status'] == 'PASS' for c in cases), cases,
          'Literal synthetic +Y type14, source-ordered gaps0..N-1, stiffness1751270000000, friction0.3. Explicit XML relocation in scratch; not JSON independence or governed replay.')
    two = add_members(original, 2)
    naive = save_model(base, project(two), 'two-members-naive-drop')
    actual = [asdict(s) for r in naive.restraints if r.node_number == 50 for s in r.specs]
    check('naive_projection_member_loss_detected', len(actual) == 1 and actual[0]['gap'] == 0,
          dict(expectedMembers=2, actualMembers=len(actual), missingGap=1,
               preservationStatus='FAIL', control='Explicit relocation retains both in the separate positive case.'),
          'Two literal derived XML members at original ordinals7/8, gaps0/1; no production oracle generates the expectation')
    return cases


def mass_checks(original, projected):
    def census(root):
        return sorted((bi, text(n, 'NodeNumber'), text(n, 'ComponentRefNo'), text(n, 'Weight'), text(n, 'Rigid'))
                      for bi, b in enumerate(root.findall('.//{*}Branch')) for n in nodes(b)
                      if text(n, 'Rigid') == '2' or float(text(n, 'Weight') or 0) != 0)
    before, after = census(original), census(projected)
    check('source_rigid_nonzero_weight_census', before == after,
          dict(sourceCensusCount=len(before), same=before == after,
               warning='Zero source weight does not establish absence from an accepted Final owner set.'),
          'Independent original XML source-designation census; not accepted mass publication')


def main():
    SCRATCH.mkdir(parents=True, exist_ok=True)
    raw = blob(FIXTURE)
    assert digest(raw) == EXPECTED_SHA
    original = ET.fromstring(raw)
    projected = project(original)
    sys.dont_write_bytecode = True
    sys.path.insert(0, str(NATIVE))
    base = importlib.import_module('xml_to_cii2019')
    patched = importlib.import_module('xml_to_cii2019_patched')
    witness = source_checks(original, projected)
    structural = structural_checks(base, patched, original, projected)
    member_checks(base, original)
    mass_checks(original, projected)
    loaded = []
    for module in list(sys.modules.values()):
        path = Path(getattr(module, '__file__', '') or '.')
        if path.parent == NATIVE and path.suffix == '.py':
            rel = 'converters/scripts/' + path.name
            loaded.append(dict(path=rel, sha256=digest(path.read_bytes()),
                               exactPinnedBytes=path.read_bytes() == blob(rel)))
    check('loaded_native_source_identity', bool(loaded) and all(s['exactPinnedBytes'] for s in loaded), loaded,
          'Exact Git bytes of each loaded native module, not a copied hash assertion')
    result = dict(task='XML229 A3 scratch alias projection qualification', pin=PIN,
        source=FIXTURE, sourceSha256=EXPECTED_SHA, authority='READ_ONLY',
        checks=CHECKS, harnessStatus='PASS' if all(c['status'] == 'PASS' for c in CHECKS) else 'FAIL',
        preservationVerdict='NAIVE_PROJECTION_NOT_QUALIFIED_IDENTITY_AND_MEMBER_LOSS',
        structural=structural, witness= str(SCRATCH/'source-alias-witness.json'),
        oracleClasses='Independent original XML/literal members; native model/formatter differential is implementation-coupled.',
        limits=['Native parser uses positive original nodes only:833 before/832 after; not1333-row governed Final.',
                'No adopted alias contract, complete JSON/config/master binding or accepted Final mass packet supplied.',
                'Scratch authored-member relocation is explicit hypothesis, not production implementation or engineering authorization.',
                'Actual governed Worker/native CII, unknown-reference grammar and private21 replay NOT_RUN.',
                'No production, source fixture, oracle, workflow or Git mutation.'],
        disposition='CONTINUE_READ_ONLY; A3 complete-preservation criterion remains0/4 with concrete falsifiers.')
    out = ROOT/'agents/evidence/xml229-a3-alias-proof-20261103.json'
    out.write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(dict(harnessStatus=result['harnessStatus'], checks=len(CHECKS),
                         verdict=result['preservationVerdict'], structural=structural, evidence=str(out))))
    assert result['harnessStatus'] == 'PASS'


if __name__ == '__main__':
    main()
