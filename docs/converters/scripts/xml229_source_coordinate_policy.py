"""Independent Decimal replay for an explicit source-query coordinate policy."""
from decimal import Decimal, InvalidOperation, localcontext
import re


def fail(suffix):
    raise ValueError('NATIVE_V2_COORDINATE_POLICY_' + suffix)


def scalar(value):
    if not re.fullmatch(r'[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?', str(value)):
        fail('INVALID')
    try:
        d = Decimal(str(value))
    except (InvalidOperation, ValueError):
        fail('INVALID')
    if not d.is_finite() or len(d.as_tuple().digits) > 128 or abs(d.as_tuple().exponent) > 128:
        fail('INVALID')
    return d


def coordinate_policy(config):
    if 'xml229SourceCoordinatePolicy' not in config:
        return None
    p = config['xml229SourceCoordinatePolicy']
    keys = {'schema', 'positionField', 'translationMm', 'xmlQuantumMm', 'identityMode'}
    if not isinstance(p, dict) or set(p) != keys:
        fail('INVALID')
    if (p['schema'] != 'XML229.SourceCoordinatePolicy.v1' or
            p['positionField'] not in ('POS', 'POSI') or
            p['identityMode'] != 'exact-branch-member' or
            scalar(p['xmlQuantumMm']) != Decimal('0.01') or
            not isinstance(p['translationMm'], list) or len(p['translationMm']) != 3):
        fail('INVALID')
    offsets = tuple(scalar(v) for v in p['translationMm'])
    if (config.get('dtxrPositionOffset') or {}).get('enabled') is True:
        fail('DATUM_CONFLICT')
    return {**p, 'offsets': offsets}


def norm(value):
    return str(value or '').strip().upper().removeprefix('/')


def resolve_policy_vertex(branches, groups, member, policy, field):
    attrs = member['attrs']
    name = next((str(v).strip() for k, v in attrs.items() if k.upper() == 'NAME'), '')
    if not name and re.fullmatch(r'=\d+/\d+', member.get('name', '')):
        name = member['name']
    ref = bool(re.fullmatch(r'=\d+/\d+', name))
    if not name or not member['branch'] or member['point'] is None:
        return None
    matches = [(vertex, node) for vertex, rows in groups.items() for b, _, node in rows
               if norm(field(branches[b], 'Branchname')) == norm(member['branch']) and
               norm(field(node, 'ComponentRefNo' if ref else 'NodeName')) == norm(name)]
    if len(matches) != 1:
        return None
    vertex, node = matches[0]
    with localcontext() as ctx:
        ctx.prec = 512
        source = tuple(scalar(v) for v in member['point'])
        raw = field(node, 'Position').split()
        if len(raw) != 3:
            return None
        target = tuple(scalar(v) for v in raw)
        if any(v % Decimal('0.01') != 0 for v in target):
            return None
        if any(abs(a - b - d) > Decimal('0.005')
               for a, b, d in zip(target, source, policy['offsets'])):
            return None
    return vertex
