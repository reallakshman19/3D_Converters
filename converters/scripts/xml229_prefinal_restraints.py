"""Recompute permitted pre-Final restraint changes from native source custody.

This deliberately does not copy restraint values out of the Worker snapshot.
The caller retains the whole-XML comparison after replaying this bounded stage.
"""
from xml229_support_type_mapper import (owner_rule_kind, node_type_user_row_conflict, mapped_support_kind, configured_support_rule,
                                         configured_mapper_semantic_conflict, described_kinds, staged_field_kind_decision,
                                         mapped_code_precedence_enabled, mapped_code_precedence_applies)
from xml229_restraint_precedence import (restraint_precedence, node_type_uses_mapper, json_node_type_attrs,
                                         select_restraint_gap, select_restraint_scalar)
from decimal import Decimal, InvalidOperation
import hashlib
import json
import math
import re
import xml.etree.ElementTree as ET
from xml229_prefinal_restraint_source import (
    NUMBER, attr, calibrated_groups, source_entries, text,
)


def local(element):
    return element.tag.rsplit('}', 1)[-1]


def children(parent, name):
    return [e for e in parent if isinstance(e.tag, str) and local(e) == name]


def field(parent, name):
    return next((text(e.text) for e in children(parent, name)), '')


def xml_type(v):
    v = text(v).upper()
    return {'GUIDE': 'GUI', 'X': 'GUI', 'LIMIT': 'LIM', 'LINESTOP': 'LIM', 'Z': 'LIM'}.get(v, v)


def present_type(v):
    v = xml_type(v)
    return {'Y': '+Y', 'REST': '+Y', '14': '+Y', '8': 'GUI', '9': 'LIM'}.get(v, v)


def placeholder(r):
    if field(r, 'Type').upper().replace(' ', '') not in ('LIM', 'LIMIT', 'LINESTOP'):
        return False
    try:
        if any(float(field(r, k) or 0) != 0 for k in ('Stiffness', 'Gap')):
            return False
    except ValueError:
        return False
    return not any(field(r, k) for k in ('DirectionCosineX', 'DirectionCosineY',
                   'DirectionCosineZ', 'OriginalText', 'ResolvedFrom', 'SideloadRow')) and not any(
                   text(r.get(k)) for k in ('source', 'basis', 'resolvedKey'))


def numeric(v):
    m = re.search(NUMBER, text(v))
    return float(m[0]) if m else None


def is_rest_hardware_member(attrs, kind):
    if kind != 'REST' or text(attrs.get('NODETYPE')) != '4':
        return False
    code = text(attrs.get('MDSSUPPTYPE')).upper()
    desc = ' '.join(text(attrs.get(k)) for k in ('DTXR','DESC','DESCRIPTION')).upper()
    return ((code == 'AT01' and re.search(r'\bPIPE\s+SHOE\b', desc)) or
            (code == 'AT05' and re.search(r'\bWEAR\s+PLATE\b', desc)))



def mds_kind_conflict(attrs, config):
    """Independently corroborated ST/GT hardware conflicts with staged NODETYPE."""
    func = text(attrs.get('MDSSUPPFUNC')).upper()
    if func not in ('ST', 'GT'):
        return None
    mds = text(attrs.get('MDSSUPPTYPE')).upper()
    catalogue = text(attrs.get('CMPSUPTYPE')).upper()
    gap = text(attrs.get('CMPSUPGAP'))
    if (not re.fullmatch(func + r'[0-9]+', mds) or
            not re.fullmatch(r'LS-[A-Z0-9-]+' if func == 'ST' else r'PG-[A-Z0-9-]+', catalogue)):
        return None
    raw_type = text(json_node_type_attrs(attrs,config).get('NODETYPE')) if restraint_precedence(config) else (text(attrs.get('SOURCE_NODETYPE')) if 'SOURCE_NODETYPE' in attrs else text(attrs.get('NODETYPE')))
    source_kind = {'+Y':'REST','GUI':'GUIDE','LIM':'LINESTOP'}.get(node_type_mutation({**attrs,'NODETYPE':raw_type},config), '')
    physical_kind = 'LINESTOP' if func == 'ST' else 'GUIDE'
    if not source_kind or physical_kind == source_kind:
        return None
    return {'code': 'NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT',
            'sourceKind': source_kind, 'candidateKind': physical_kind,
            'sourceName': text(attrs.get('NAME')),
            'fields': {k: (raw_type if k == 'NODETYPE' else text(attrs.get(k))) for k in
                ('NAME','NODETYPE','MDSSUPPFUNC','MDSSUPPTYPE','CMPSUPTYPE','CMPSUPGAP')}}


def mds_kind_approval(attrs, config, conflict):
    if not conflict:
        return None
    if not re.search(r'[-+]?\d+(?:\.\d+)?\s*mm', conflict['fields']['CMPSUPGAP'], re.I):
        return None
    rows = config.get('xml229RestraintKindOverrides') or []
    if not isinstance(rows, list):
        raise ValueError('NATIVE_PREFINAL_RESTRAINT_OVERRIDE_INVALID')
    matches = [row for row in rows if isinstance(row, dict) and
               text(row.get('memberName')) == conflict['sourceName']]
    if len(matches) > 1:
        raise ValueError('NATIVE_PREFINAL_RESTRAINT_OVERRIDE_AMBIGUOUS')
    if not matches:
        return None
    row = matches[0]
    if (row.get('approved') is not True or
            text(row.get('kind')).upper() != conflict['candidateKind'] or
            not text(row.get('approvedBy')) or not text(row.get('evidenceRef'))):
        return None
    expected = row.get('expected') or {}
    if not isinstance(expected, dict) or any(text(expected.get(k)) != v
        for k,v in conflict['fields'].items()):
        return None
    return conflict['candidateKind']


def field_precedence(config, key):
    if key == 'mappedCodes':
        return mapped_code_precedence_enabled(config)
    return (config.get('xml229SourceFieldPrecedence') or {}).get(key) is True


def saved_profile_gap(config, kind):
    return text(((config.get('supportMapping') or {}).get('kindProfiles') or {}).get(kind, {}).get('gap'))


def preferred_kind(attrs, config, conflict=None):
    raw_type = text(attrs.get('SOURCE_NODETYPE')) if 'SOURCE_NODETYPE' in attrs else text(attrs.get('NODETYPE'))
    raw_kind = {'+Y':'REST','GUI':'GUIDE','LIM':'LINESTOP'}.get(node_type_mutation({**attrs,'NODETYPE':raw_type},config),'')
    preferred = staged_field_kind_decision(attrs,config,raw_kind)
    if conflict:
        catalogue = any(text(attrs.get(k)) for k in ('CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS'))
        if preferred != conflict['candidateKind'] or (not restraint_precedence(config) and not catalogue and
            not (field_precedence(config,'gap') and saved_profile_gap(config,preferred))):
            return ''
    return preferred


def effective_node_type(attrs, config):
    conflict=mds_kind_conflict(attrs,config)
    kind=mds_kind_approval(attrs,config,conflict) or preferred_kind(attrs,config,conflict)
    return {'REST':'+Y','GUIDE':'GUI','LINESTOP':'LIM'}.get(kind) or node_type_mutation(json_node_type_attrs(attrs,config),config)


def preferred_scalar(attrs,config,field,kind=''):
    if restraint_precedence(config) and kind:
        return str(select_restraint_scalar(attrs,config,field,kind,profile_for(kind,config))['value'])
    if not field_precedence(config,field):
        return ''
    aliases=('STIFFNESS','NODESTIFFNESS','CMPSUPSTIFF') if field=='stiffness' else ('FRICTION','CMPSUPFRICTION')
    values=[text(attrs.get(k)) for k in aliases if text(attrs.get(k))]
    if not values:
        return ''
    try:
        numbers=list(map(float,values))
        if any(not math.isfinite(n) or (n<=0 if field=='stiffness' else n<0 and n!=-1.0101) for n in numbers) or any(n!=numbers[0] for n in numbers):
            raise ValueError()
    except (ValueError,TypeError):
        raise ValueError('NATIVE_PREFINAL_RESTRAINT_'+field.upper()+'_AMBIGUOUS') from None
    return values[0]


def kinds(entries, require, config=None):
    config = config or {}
    out = {}
    # Two staged rows asserting different NODETYPE for one exact physical
    # NAME are not two independent restraints; the same member is ambiguous.
    by_name = {}
    for entry in entries:
        attrs = entry.get('attrs') or {}
        name = text(attrs.get('NAME')).upper()
        raw_type = text(attrs.get('NODETYPE'))
        if name and raw_type:
            prior = by_name.get(name)
            require(not (prior and prior != raw_type),
                    'NATIVE_PREFINAL_RESTRAINT_TYPE_AMBIGUOUS')
            by_name[name] = raw_type
    for e in entries:
        a = e['attrs']
        # Owner rule (12 Nov, RCA-04): the source NODETYPE (after the 8 Config
        # mutation) wins when present: 14 -> REST, 8 -> GUIDE, 9 -> LINESTOP.
        conflict = mds_kind_conflict(a,config)
        approval = mds_kind_approval(a,config,conflict) if conflict else None
        preferred = '' if approval else preferred_kind(a, config, conflict)
        if conflict:
            require(bool(approval or preferred), 'NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT')
        elif not preferred and not restraint_precedence(config) and mapped_code_precedence_applies(a,config) and text(a.get('SOURCE_NODETYPE')):
            codes=a.get('NODETYPE_CODES')
            original=text(a.get('SOURCE_NODETYPE'))
            require(text(a.get('NODETYPE'))==original and isinstance(codes,list) and
                    len(codes)==1 and text(codes[0])==original, 'NATIVE_PREFINAL_RESTRAINT_TYPE_AMBIGUOUS')
        node_type_kind = approval or preferred or {'+Y': 'REST', 'GUI': 'GUIDE', 'LIM': 'LINESTOP'}.get(
            node_type_mutation(json_node_type_attrs(a,config), config), '')
        if preferred:
            configured_mapper_semantic_conflict(a,e['desc'],config,preferred,require)
        if node_type_kind and not (approval or preferred):
            node_type_user_row_conflict(a, config, node_type_kind)
        table_kind = '' if node_type_kind else owner_rule_kind(a, config)[0]
        if table_kind:
            # A Step 7 table answer must still agree with edited Tab 7 keywords.
            configured_mapper_semantic_conflict(a, e['desc'], config, table_kind, require)
        if node_type_kind or table_kind:
            kind = node_type_kind or table_kind
        else:
            # The historical qualified mapper lets explicit engineering meaning
            # outrank abbreviated GT/ST. Do not copy its legacy DOF/axis defaults.
            # No DTXR/DESC text: the MDS description (MDSDTXR) is the explicit
            # engineering meaning (e.g. LINE STOP); a staged SUPPORT_KIND label
            # must not override it. Mirrors xml-cii-mds-restraint-closure.js.
            # e['desc'] is a derived trace label (often the SPRE path), so it
            # never suppresses the MDSDTXR fallback.
            source = [v for v in (text(a.get(k)) for k in ('DTXR', 'DESC', 'DESCRIPTION')) if v]
            desc = ' '.join(v for v in (source or [text(a.get('MDSDTXR'))]) + [text(e['desc'])]
                            if v).upper()
            semantic = [
                k for k, pat in (
                    ('LINESTOP', r'\b(?:PIPE\s*STOP|LINE\s*STOP|LINESTOP|LIMIT\s*STOP|AXIAL\s*STOP|DIRECTIONAL\s+ANCHOR)\b'),
                    ('GUIDE', r'\bGUIDE\b'),
                    ('REST', r'\b(?:PIPE[- ]?REST|REST)\b|\bSHOE\b'))
                if re.search(pat, desc)
            ]
            if 'REST' in semantic and 'LINESTOP' in semantic and \
                    re.search(r'\bSHOE\b', desc) and \
                    not re.search(r'\b(?:PIPE[- ]?REST|REST)\b', desc):
                semantic.remove('REST')
            if 'REST' in semantic and 'GUIDE' in semantic and \
                    re.search(r'\bSHOE\b', desc) and \
                    not re.search(r'\b(?:PIPE[- ]?REST|REST)\b', desc):
                semantic.remove('REST')
            require(len(set(semantic)) <= 1, 'NATIVE_PREFINAL_RESTRAINT_KIND_AMBIGUOUS')
            canonical = {
                text(a.get(k)).upper().replace(' ', '') for k in
                ('SUPPORT_KIND', 'SUPPORT_MAPPER_KIND', 'SUPPORT_TYPE')
                if text(a.get(k)).upper().replace(' ', '') in ('REST', 'GUIDE', 'LINESTOP')
            }
            require(len(canonical) <= 1, 'NATIVE_PREFINAL_RESTRAINT_KIND_AMBIGUOUS')
            custom_kind = configured_support_rule(a, e['desc'], config, require)
            if custom_kind and semantic:
                require(custom_kind == semantic[0],
                        'NATIVE_PREFINAL_RESTRAINT_KIND_AMBIGUOUS')
            if custom_kind:
                require(custom_kind in ('REST','GUIDE','LINESTOP'),
                        'NATIVE_PREFINAL_RESTRAINT_KIND_UNSUPPORTED')
            if semantic or custom_kind:
                configured_mapper_semantic_conflict(a, e['desc'], config,
                                                     semantic[0] if semantic else custom_kind, require)
            mapped_kind, score = ('', 0) if semantic or custom_kind else mapped_support_kind(
                a, e['desc'], config, require)
            code = text(a.get('MDSSUPPTYPE')).upper()
            kind = (semantic[0] if semantic
                    else custom_kind if custom_kind
                    else mapped_kind if score >= .65 and mapped_kind in ('REST','GUIDE','LINESTOP')
                    else next(iter(canonical)) if canonical
                    else mapped_kind if mapped_kind in ('REST','GUIDE','LINESTOP')
                    else 'GUIDE' if code.startswith('GT') else 'LINESTOP' if code.startswith('ST')
                    else 'REST' if code == 'PIPE-REST' or code.startswith('AT') or
                    re.search(r'\b(?:PIPE[- ]?REST|REST|SHOE)\b',
                              text(a.get('SPRE')).upper()) else '')
        if not kind:
            continue
        raw = source_gap(a)
        preferred_scalar(a,config,'stiffness',kind);preferred_scalar(a,config,'friction',kind)
        # CMPSUPGAP is a source member's explicit gap. Historical NODEGAP=0
        # is a placeholder when this SAME member supplies CMPSUPGAP.
        # Two nonzero/different explicit values must still fail closed.
        if restraint_precedence(config):
            effective_gap(a,config,kind)
        legacy_zero_placeholder = not restraint_precedence(config) and bool(text(a.get('CMPSUPGAP'))) and (
            text(a.get('NODEGAP')) != '' and numeric(a.get('NODEGAP')) == 0
        )
        prefer_catalogue=field_precedence(config,'gap') and any(text(a.get(k)) for k in ('CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS'))
        alias_values = [text(a.get(k)) for k in
                        ('CMPSUPGAP', 'CMPSUPGAP_POS', 'CMPSUPGAP_PS', 'NODEGAP')
                        if text(a.get(k)) and (k != 'NODEGAP' or not (legacy_zero_placeholder or prefer_catalogue))]
        if legacy_zero_placeholder and numeric(a.get('CMPSUPGAP')) != 0:
            print('XML229_GAP_ALIAS_AUTHORITY ' + json.dumps({
                'memberName': text(a.get('NAME')),
                'kind': kind, 'sourceField': 'CMPSUPGAP',
                'sourceValue': text(a.get('CMPSUPGAP')),
                'ignoredLegacyZero': text(a.get('NODEGAP')),
                'reason': 'legacy-NODEGAP-zero-placeholder',
            }, sort_keys=True))
        if not restraint_precedence(config):
            require(all(numeric(v) is not None for v in alias_values),
                    'NATIVE_PREFINAL_RESTRAINT_GAP_INVALID')
            require(all(numeric(v) == numeric(raw) for v in alias_values),
                    'NATIVE_PREFINAL_RESTRAINT_GAP_AMBIGUOUS')
        previous_attrs = out.get(kind, {})
        # A REST datum is a different structural source role from its co-located
        # AT01 shoe / AT05 wear-pad hardware; prioritize the true REST owner
        # before testing for conflicting authoritative REST gaps.
        if previous_attrs and kind == 'REST':
            previous_hardware = is_rest_hardware_member(previous_attrs, kind)
            current_hardware = is_rest_hardware_member(a, kind)
            if previous_hardware != current_hardware:
                if previous_hardware:
                    out[kind] = a
                continue
        previous = source_gap(previous_attrs)
        require(not (previous_attrs and (restraint_precedence(config) or (previous and raw)) and effective_gap(previous_attrs,config,kind) != effective_gap(a,config,kind)),
                'NATIVE_PREFINAL_RESTRAINT_GAP_AMBIGUOUS')
        prior_type = effective_node_type(previous_attrs, config)
        current_type = effective_node_type(a, config)
        if prior_type and current_type and prior_type != current_type:
            first_aux = is_rest_hardware_member(previous_attrs, kind)
            second_aux = is_rest_hardware_member(a, kind)
            if first_aux != second_aux:
                if first_aux:
                    out[kind] = a
                continue
            require(False, 'NATIVE_PREFINAL_RESTRAINT_TYPE_AMBIGUOUS')
        for scalar in ('stiffness','friction'):
            left,right=(preferred_scalar(previous_attrs,config,scalar,kind) if previous_attrs else ''),preferred_scalar(a,config,scalar,kind)
            require(not (left and right and float(left)!=float(right)), 'NATIVE_PREFINAL_RESTRAINT_'+scalar.upper()+'_AMBIGUOUS')
        if kind not in out or (not previous and raw):
            out[kind] = a
    return out


def source_gap(a):
    return next((text(a.get(k)) for k in
                 ('CMPSUPGAP', 'CMPSUPGAP_POS', 'CMPSUPGAP_PS', 'NODEGAP')
                 if text(a.get(k))), '')


def effective_gap(attrs,config,kind):
    if restraint_precedence(config):
        return select_restraint_gap(attrs,config,kind,profile_for(kind,config))['value']
    catalogue=any(text(attrs.get(k)) for k in ('CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS'))
    saved=saved_profile_gap(config,kind)
    if field_precedence(config,'gap') and attrs and not catalogue and saved:
        try:
            n=float(saved)
            if not math.isfinite(n) or n<0:
                raise ValueError()
        except ValueError:
            raise ValueError('NATIVE_PREFINAL_RESTRAINT_CONFIG_INVALID') from None
        return n
    raw=source_gap(attrs)
    return numeric(raw) if raw else 0


def vector(value):
    if isinstance(value, dict):
        value = [value.get(k, value.get(k.upper(), 0)) for k in ('x', 'y', 'z')]
    if isinstance(value, str):
        value = re.findall(NUMBER, value)
    if not isinstance(value, (list, tuple)) or len(value) < 3:
        return None
    try:
        v = tuple(float(x) for x in value[:3])
        size = math.sqrt(sum(x*x for x in v))
        return tuple(x/size for x in v) if math.isfinite(size) and size > 1e-9 else None
    except (TypeError, ValueError):
        return None


def attr_vector(a, names):
    return next((v for name in names if (v := vector(a.get(name)))), None)


def direction(profile, attrs, node):
    mode = profile['directionMode']
    if mode == 'fixed':
        return vector(profile.get('direction'))
    if mode == 'from-xml':
        return vector([field(node, 'DirectionCosine' + axis) or 0 for axis in 'XYZ'])
    if mode == 'from-staged':
        return attr_vector(attrs, ['DIRECTION_COSINES', 'DIRECTIONCOSINES', 'SUPPORT_DIRECTION_COSINES',
                                  'SUPPORTDIRECTIONCOSINES', 'DIRCOS', 'DIRECTION', 'SUPPORT_DIRECTION'])
    axis = attr_vector(attrs, ['PIPE_AXIS_COSINES', 'PIPEAXISCOSINES', 'PIPE_AXIS', 'PIPEAXIS',
                              'PIPE_AXIS_VECTOR', 'PIPEAXISVECTOR', 'AXIS', 'DIRECTION_COSINES', 'DIRECTIONCOSINES'])
    if not axis or mode not in ('pipe-axis', 'pipe-normal'):
        return None
    if mode == 'pipe-axis':
        return axis
    x, y, z = axis
    return vector((z, 0, -x) if abs(y) < .9 else (0, -z, y))


def profile_for(kind, config):
    typ, mode = {'REST': ('+Y', 'fixed'), 'GUIDE': ('GUI', 'pipe-normal'),
                 'LINESTOP': ('LIM', 'pipe-axis')}[kind]
    p = dict(xmlTypes=(config.get('supportKindToXmlType') or {}).get(kind) or [typ],
             directionMode=mode, direction={'x': 0, 'y': 1, 'z': 0} if kind == 'REST' else None,
             stiffness='default', gap='0' if restraint_precedence(config) else text(config.get('defaultGap', '0')),
             frictionMode='default' if kind == 'REST' else 'sentinel', fixedFriction='')
    mapping = config.get('supportMapping') or {}
    if float(mapping.get('version') or 0) >= 2:
        p.update({k: v for k, v in (mapping.get('kindProfiles', {}).get(kind) or {}).items() if v is not None})
    values = p['xmlTypes']
    if isinstance(values, str):
        values = [v for part in re.split(r'[,;\n]', values) for v in re.split(r'(?<=\w)(?=\+)', part)]
    p['xmlTypes'] = [xml_type(v) for v in values if text(v)]
    return p



def node_type_mutation(attrs, config):
    """Native counterpart of 8 Config mutation; source NODETYPE is numeric."""
    raw = text(attrs.get('NODETYPE'))
    if not raw:
        return ''
    if not re.fullmatch(r'[0-9]+', raw) or not 1 <= int(raw) <= 62:
        raise ValueError('NATIVE_PREFINAL_RESTRAINT_TYPE_INVALID')
    value = int(raw)
    rules = (config.get('inputXmlRestraintTypeMutation') or
             config.get('restraintTypeMutation') or {})
    defaults = [('17', '14'), ('7', '9'), ('10', '8'),
                ('1', '2'), ('2', '3'), ('3', '5'), ('18', '15')]
    if rules.get('enabled') is not False:
        rows = rules.get('rows')
        selected = [(row.get('from'), row.get('to'), row.get('label')) for row in rows
                    if isinstance(row, dict)] if isinstance(rows, list) else \
            [(source, target, '') for source, target in defaults]
        for source, target, label in selected:
            if text(source) == str(value):
                # Owner rule: NODETYPE decides the kind, so a saved row whose
                # label contradicts its target (legacy "LIM 7 -> 8") is refused.
                expected = {'+Y': '14', 'GUI': '8', 'LIM': '9'}.get(text(label).upper())
                if expected and text(target) != expected:
                    raise ValueError('NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT')
                # A user-authored mutation from a non-governed CAESAR type
                # into REST/GUI/LIM cannot contradict an explicit source DTXR.
                target_kind = {'14':'REST','8':'GUIDE','9':'LINESTOP'}.get(text(target))
                explicit = described_kinds(attrs)
                if target_kind and len(explicit) == 1 and explicit[0] != target_kind:
                    raise ValueError('NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT')
                if not re.fullmatch(r'[0-9]+', text(target)) or not 1 <= int(target) <= 62:
                    raise ValueError('NATIVE_PREFINAL_RESTRAINT_TYPE_INVALID')
                value = int(target)
                break
    return present_type(str(value))

def append_profile(node, kind, attrs, config, allowed=None):
    p = profile_for(kind, config)
    ns = node.tag.rsplit('}', 1)[0] + '}' if '}' in node.tag else ''
    d = direction(p, attrs, node)
    raw = source_gap(attrs)
    # Keep source-owned zero when no authored clearance exists. Only the
    # explicit Gap policy may select a saved Step 7 profile value.
    require_gap = effective_gap(attrs,config,kind) if field_precedence(config,'gap') and attrs else (numeric(raw) if raw else 0)
    if field_precedence(config,'gap') and attrs and saved_profile_gap(config,kind) and not any(
        text(attrs.get(k)) for k in ('CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS')):
        raw=''
    if restraint_precedence(config):
        selected_gap=select_restraint_gap(attrs,config,kind,p)
        require_gap=selected_gap['value']
        raw=text(selected_gap['raw']) if selected_gap['attribute'] else ''
    if require_gap is None or not math.isfinite(require_gap):
        raise ValueError('NATIVE_PREFINAL_RESTRAINT_GAP_INVALID')
    gap = str(require_gap)
    original_type = node_type_mutation(json_node_type_attrs(attrs,config), config)
    conflict = mds_kind_conflict(attrs,config)
    approval = mds_kind_approval(attrs,config,conflict) if conflict else None
    preferred = '' if approval else preferred_kind(attrs,config,conflict)
    if conflict and not (approval or preferred):
        raise ValueError('NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT')
    if approval or preferred:
        original_type = {'REST': '+Y', 'GUIDE': 'GUI', 'LINESTOP': 'LIM'}[approval or preferred]
    if original_type in ('+Y','GUI','LIM') and original_type != {
            'REST':'+Y','GUIDE':'GUI','LINESTOP':'LIM'}[kind]:
        raise ValueError('NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT')
    for typ in ([original_type] if original_type else p['xmlTypes']):
        if allowed is not None and present_type(typ) in allowed:
            continue
        friction = text(config.get('defaultFriction', '0.3')) or '0.3'
        if p['frictionMode'] == 'fixed' and text(p.get('fixedFriction')):
            friction = text(p['fixedFriction'])
        elif p['frictionMode'] == 'sentinel' and config.get('useFrictionSentinelForNonYSupports') is not False and typ not in ('Y', '+Y'):
            friction = '-1.010100'
        actual_gap = gap
        friction = preferred_scalar(attrs,config,'friction',kind) or friction
        stiffness=preferred_scalar(attrs,config,'stiffness',kind) or (text(p['stiffness']) if text(p['stiffness']) not in ('','default')
                  else text(config.get('defaultStiffness')) or '1.751270E+12')
        values = [('Type', typ), ('Stiffness', stiffness),
                  ('Gap', actual_gap), ('Friction', friction)]
        if raw:
            values.append(('CMPSUPGAP', raw))
        if d:
            values.extend(('DirectionCosine' + axis, f'{v:.9f}') for axis, v in zip('XYZ', d))
        r = ET.SubElement(node, ns + 'Restraint')
        for name, value in values:
            ET.SubElement(r, ns + name).text = value
        if allowed is not None:
            allowed.add(present_type(typ))



# This allow-list is kept in parity with restraintAuditConfig() in
# tabs/xml-cii-2019-standalone/xml-cii-restraint-audit.js. It is intentionally
# narrow: any changed field governing restraints invalidates the pre-Final
# original-source audit. An unrelated display option does not.
_RESTRAINT_AUDIT_CONFIG_KEYS = (
    'supportMapping', 'supportTypeMapper', 'inputXmlRestraintTypeMutation',
    'restraintTypeMutation', 'xml229RestraintKindOverrides', 'xml229SourceFieldPrecedence', 'xml229RestraintPrecedence',
    'defaultStiffness', 'defaultGap', 'defaultFriction',
    'useFrictionSentinelForNonYSupports', 'supportKindToXmlType',
    'dtxrPositionOffset', 'dtxrCoordinateToleranceMm', 'coordinateTolerance',
    'resolverJsonTrace', 'jsonTrace', 'xml229PhysicalVertexPrefinal',
    'xml229SourceCoordinatePolicy', 'xml229SourceAttachmentPolicy',
)


def verify_prefinal_restraint_config_custody(final, stage, config, require):
    # Authentic source-bound Final geometry includes a signed-in-the-packet
    # restraint audit. Small isolated replay unit fixtures without the Final
    # geometry schema retain their explicit fixture API behavior.
    complete = final.get('schema') == 'XML229.FinalizedWeightGeometry.v1'
    audit = stage.get('restraintAudit')
    if complete:
        require(isinstance(audit, dict) and
                isinstance(audit.get('recordedConfig'), dict) and
                isinstance(audit.get('basis'), dict) and
                isinstance(audit.get('basis', {}).get('configSha256'), str),
                'NATIVE_FINALIZED_GEOMETRY_SOURCE_DRIFT')
    if audit is None:
        return
    require(isinstance(audit, dict) and isinstance(audit.get('recordedConfig'), dict),
            'NATIVE_FINALIZED_GEOMETRY_SOURCE_DRIFT')
    current = {key: config[key] for key in _RESTRAINT_AUDIT_CONFIG_KEYS if key in config}
    if config.get('xml229PhysicalVertexPrefinal') is not True:
        current['xml229SourceFieldPrecedence'] = {
            **(current.get('xml229SourceFieldPrecedence') or {}),
            'mappedCodes': mapped_code_precedence_enabled(config)}
    recorded = audit['recordedConfig']
    require(current == recorded,
            'NATIVE_FINALIZED_GEOMETRY_SOURCE_DRIFT')
    # Verify that the recorded config was not changed without updating its
    # source-bound pre-Final SHA. Canonical ordering follows the JS producer.
    def canonical(value):
        if isinstance(value, dict):
            return {key: canonical(value[key]) for key in sorted(value)}
        if isinstance(value, list):
            return [canonical(item) for item in value]
        if isinstance(value, float) and value.is_integer():
            return int(value)
        return value
    digest = hashlib.sha256(json.dumps(canonical(recorded), sort_keys=True,
       ensure_ascii=False, separators=(',', ':')).encode('utf-8')).hexdigest()
    require(digest == audit['basis'].get('configSha256'),
            'NATIVE_FINALIZED_GEOMETRY_SOURCE_DRIFT')


def replay_prefinal_restraints(expected, packet, staged_json_path, config, require, provenance_config=None):
    final = packet.get('finalizedGeometry') or {}
    stage = final.get('prefinalRestraints')
    if stage is None:
        return False
    require(isinstance(stage, dict) and stage.get('schema') in (
        'XML229.PrefinalRestraints.v1', 'XML229.PrefinalRestraints.v2'),
            'NATIVE_PREFINAL_RESTRAINT_STAGE_INVALID')
    require(stage.get('engineeringRestraintAcceptance') != 'HOLD' and
            not (stage.get('restraintAudit') or {}).get('warnings'),
            'NATIVE_PREFINAL_RESTRAINT_REVIEW_HOLD')
    raw = staged_json_path.read_bytes() if staged_json_path is not None else b''
    sha = hashlib.sha256(raw).hexdigest()
    require(stage.get('originalJsonSha256') == sha and
            (not packet.get('originalJsonSha256') or packet['originalJsonSha256'] == sha),
            'NATIVE_PREFINAL_RESTRAINT_SOURCE_SHA_DRIFT')
    require(isinstance(config, dict), 'NATIVE_PREFINAL_RESTRAINT_CONFIG_REQUIRED')
    verify_prefinal_restraint_config_custody(final, stage,
        provenance_config if provenance_config is not None else config, require)
    wants_v2=config.get('xml229PhysicalVertexPrefinal') is True and bool(raw.strip()) and \
        (config.get('supportMapping') or {}).get('useJsonForRestraints') is not False
    require(stage['schema']==('XML229.PrefinalRestraints.v2' if wants_v2 else 'XML229.PrefinalRestraints.v1'),
            'NATIVE_PREFINAL_RESTRAINT_MODE_DRIFT')
    if (config.get('supportMapping') or {}).get('useJsonForRestraints') is False:
        require(stage['schema'] != 'XML229.PrefinalRestraints.v2',
                'NATIVE_PREFINAL_RESTRAINT_MODE_DRIFT')
        return True
    try:
        parsed = json.loads(raw.decode('utf-8-sig')) if raw.strip() else []
    except (ValueError, UnicodeError):
        require(False, 'NATIVE_PREFINAL_RESTRAINT_SOURCE_INVALID')
    if stage['schema'] == 'XML229.PrefinalRestraints.v2':
        require(not restraint_precedence(config) and not any(field_precedence(config,k) for k in ('type','gap','stiffness','friction','mappedCodes')), 'NATIVE_PREFINAL_RESTRAINT_CONFIG_INVALID')
        require(config.get('xml229PhysicalVertexPrefinal') is True and bool(raw.strip()),
                'NATIVE_PREFINAL_RESTRAINT_MODE_DRIFT')
        from xml229_physical_vertex_prefinal import replay_physical_vertex_prefinal
        return replay_physical_vertex_prefinal(expected, parsed, config,
            stage.get('physicalVertexMemberCensus'), require)
    source_nodes = [(field(b, 'Branchname'), n) for b in expected.iter() if local(b) == 'Branch'
                    for n in children(b, 'Node')]
    groups = calibrated_groups(source_nodes, source_entries(parsed, config), config, field)
    from xml229_prefinal_restraint_source import resolve, tolerance, _ResolutionIndex
    resolver_index = _ResolutionIndex(groups, tolerance(config))
    for branch, node in source_nodes:
        typ = field(node, 'ComponentType').upper()
        if typ not in ('ATTA', 'ANCI'):
            continue
        evidence = kinds(resolve(node, branch, groups, tolerance(config), field, require,
                                 resolver_index, config), require, config)
        if evidence:
            for r in children(node, 'Restraint'):
                if placeholder(r):
                    node.remove(r)
            present = {present_type(field(r, 'Type')) for r in children(node, 'Restraint')}
            for kind in ('REST', 'GUIDE', 'LINESTOP'):
                if kind in evidence:
                    append_profile(node, kind, evidence[kind], config, present)
        rows = children(node, 'Restraint')
        if typ == 'ATTA' and (not rows or all(map(placeholder, rows))):
            for r in rows:
                node.remove(r)
            append_profile(node, 'REST', {}, config)
    return True


def restraint_semantics(element):
    """Canonical numeric formatting only; never ignore fields/attributes/order."""
    numeric_fields = {'Stiffness', 'Gap', 'Friction', 'DirectionCosineX', 'DirectionCosineY', 'DirectionCosineZ'}
    for r in element.iter():
        if local(r) != 'Restraint':
            continue
        for c in r:
            if local(c) in numeric_fields:
                try:
                    value = Decimal(text(c.text))
                    if value.is_finite():
                        c.text = str(value.normalize()) if value else '0'
                except InvalidOperation:
                    pass
