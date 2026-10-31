"""Independent original-JSON support resolution for pre-Final XML verification.

Reads source hierarchy/coordinates, never Worker-claimed kinds or gaps. This is
the native counterpart of the existing positional/PS source matching contract.
"""
import html
import math
import re

NUMBER = r"[-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][+-]?\d+)?"
POSITIONS = ('SUPPORTCOORD', 'SUPPORT_COORD', 'POS', 'POSI', 'BPOS',
             'APOS', 'LPOS', 'CPOS', 'HPOS', 'TPOS', 'SPOS', 'EPOS', 'DTXR_POS')


def text(v):
    return '' if v is None else str(v).strip()


def attr(attrs, *names):
    for name in names:
        for key, value in attrs.items():
            if key.upper() == name.upper() and text(value):
                return value
    return ''


def branch_name(v):
    v = re.sub(r'<\/?Branchname[^>]*>', '', html.unescape(text(v)), flags=re.I)
    v = re.sub(r'^\s*=\s*', '', v).replace('“', '"').replace('”', '"')
    v = v.replace('‘', "'").replace('’', "'").replace('\\"', '"').replace('\\', '/')
    v = '/' + re.sub(r'\s+', '', re.sub('/+', '/', v)).strip('/')
    return re.sub(r'/B0*(\d+)$', r'/B\1', v, flags=re.I).upper()


def branch_root(v):
    return re.sub(r'/B\d+$', '', branch_name(v), flags=re.I)


def relationship(a, b):
    if not text(b):
        return 50
    a, b = branch_name(a), branch_name(b)
    if a == b:
        return 100
    a, b = branch_root(a), branch_root(b)
    if a == b:
        return 95
    return 92 if a.replace('"', '').replace("'", '') == b.replace('"', '').replace("'", '') else 0


def point(value):
    if isinstance(value, dict):
        value = [next((value[k] for k in keys if k in value), None) for keys in
                 [('x', 'X', 'E', 'east'), ('y', 'Y', 'N', 'north'),
                  ('z', 'Z', 'U', 'EL', 'elev', 'elevation')]]
    if isinstance(value, (list, tuple)):
        try:
            p = tuple(float(v) for v in value[:3])
            return p if len(p) == 3 and all(map(math.isfinite, p)) else None
        except (ValueError, TypeError):
            return None
    axes = {}
    for axis, raw in re.findall(r'\b(EL|E|W|N|S|U|D)\s*[:=]?\s*(' + NUMBER + ')', text(value), re.I):
        key, sign = {'E': (0, 1), 'W': (0, -1), 'N': (1, 1), 'S': (1, -1),
                     'U': (2, 1), 'EL': (2, 1), 'D': (2, -1)}[axis.upper()]
        axes[key] = float(raw) * sign
    if len(axes) == 3:
        return tuple(axes[i] for i in range(3))
    nums = re.findall(NUMBER, text(value))
    return point(nums[:3]) if len(nums) >= 3 else None


def tags(value):
    return {v.lstrip('/').replace('PS-', 'PS') for v in
            re.findall(r'/?PS-?\d+(?:\.\d+)?', text(value).upper())}


def tolerance(config):
    values = [(config.get('resolverJsonTrace') or {}).get('coordinateTolerance'),
              (config.get('jsonTrace') or {}).get('coordinateTolerance'),
              config.get('dtxrCoordinateToleranceMm'), config.get('coordinateTolerance'),
              (config.get('dtxrPositionOffset') or {}).get('tolerance')]
    for v in values:
        try:
            if float(v) > 0 and math.isfinite(float(v)):
                return float(v)
        except (ValueError, TypeError):
            pass
    return 6


def source_entries(value, config, branch='', inherited=None):
    if isinstance(value, list):
        return [e for item in value for e in source_entries(item, config, branch, inherited)]
    if not isinstance(value, dict):
        return []
    a = value.get('attributes') or {}
    typ = text(value.get('type') or a.get('TYPE')).upper()
    children = value.get('children') or []
    if typ == 'BRANCH':
        branch = text(value.get('name') or attr(a, 'OWNER', 'BRANCH', 'PIPE') or branch)
    direct = None
    for alias in POSITIONS:
        direct = point(attr(a, alias))
        if direct is not None:
            off = config.get('dtxrPositionOffset') or {}
            if alias == 'POSI' and off.get('enabled') is True:
                direct = tuple(v + float(off.get(k) or 0) for v, k in
                               zip(direct, ('xOffset', 'yOffset', 'zOffset')))
            break
    direct = direct or point(value.get('position') or value.get('point'))
    pos = direct or inherited
    raw = attr(a, 'DTXR_POS')
    desc = text((attr(a, 'DTXR', 'DESC', 'DESCRIPTION', 'RTEXT', 'SPRE') if point(raw)
                 else raw or attr(a, 'DTXR', 'DESC', 'DESCRIPTION', 'RTEXT', 'SPRE'))
                or ('' if children else value.get('name') or typ))
    ps = text(attr(a, 'DTXR_PS', 'DTXRPS'))
    name = text(attr(a, 'NAME', 'NodeName', 'SupportTag'))
    out = []
    if typ != 'BRANCH' and not (direct and children and not desc and not ps) and pos and (
            desc or ps or text(attr(a, 'CMPSUPGAP', 'SUPPORT GAP'))):
        out.append(dict(branch=branch, point=pos, attrs=a, type=typ, desc=desc,
                        ps=ps, name=name, tags=tags(' '.join([name, desc, ps,
                        text(attr(a, 'PS', 'supportPs', 'psNo'))]))))
    for child in children:
        out.extend(source_entries(child, config, branch, pos))
    return out


def position_groups(entries, tol):
    groups = []
    for entry in entries:
        hits = [(math.dist(g['point'], entry['point']), i) for i, g in enumerate(groups)
                if branch_root(g['branch']) == branch_root(entry['branch']) and
                math.dist(g['point'], entry['point']) <= tol]
        if hits:
            group = groups[min(hits)[1]]
        else:
            group = dict(point=entry['point'], branch=entry['branch'], entries=[])
            groups.append(group)
        group['entries'].append(entry)
    return groups


def resolve(node, branch, groups, tol, field, require):
    pos, tag = point(field(node, 'Position')), tags(field(node, 'NodeName') or field(node, 'ComponentRefNo'))
    tag = next(iter(tag), '')
    explicit, authoritative = [], []
    for g in groups:
        for e in g['entries']:
            ref = attr(e['attrs'], 'ComponentRefNo', 'COMPONENTREFNO', 'COMPRE',
                       'ATTACHED_COMPONENT_REF', 'REF', 'RefNo')
            if tag and tag in e['tags'] and re.search(r'/B\d+$', branch_name(ref)):
                authoritative.append(e)
                if relationship(branch, ref):
                    explicit.append((g, e))
    require(len(explicit) <= 1, 'NATIVE_PREFINAL_RESTRAINT_MATCH_AMBIGUOUS')
    if authoritative and not explicit:
        return []
    hits = []
    for i, g in enumerate(groups):
        score = relationship(branch, g['branch'])
        dist = math.dist(pos, g['point']) if pos else math.inf
        if score and dist <= tol:
            hits.append((-score, -int(any(tag and tag in e['tags'] for e in g['entries'])), dist, i, g))
    hits.sort(key=lambda h: h[:4])
    require(not (len(hits) > 1 and hits[0][:2] == hits[1][:2] and
                 abs(hits[0][2] - hits[1][2]) < .001), 'NATIVE_PREFINAL_RESTRAINT_MATCH_AMBIGUOUS')
    if hits and (not explicit or hits[0][4] is explicit[0][0]):
        return hits[0][4]['entries']
    if explicit:
        return [explicit[0][1]]
    ps = [(relationship(branch, g['branch']), i, e) for i, g in enumerate(groups)
          for e in g['entries'] if tag and tag in e['tags'] and relationship(branch, g['branch'])]
    ps.sort(key=lambda h: (-h[0], h[1]))
    return [ps[0][2]] if ps and (len(ps) == 1 or ps[0][0] > ps[1][0]) else []


def calibrated_groups(source_nodes, entries, config, field):
    tol = tolerance(config)
    groups = position_groups(entries, tol)
    # Auto offset is permitted only when no direct positional match exists.
    if (config.get('dtxrPositionOffset') or {}).get('enabled') is True or any(
            point(field(n, 'Position')) and relationship(b, g['branch']) and
            math.dist(point(field(n, 'Position')), g['point']) <= tol
            for b, n in source_nodes for g in groups):
        return groups
    options = config.get('resolverJsonTrace') or {}
    precision = max(float(options.get('autoCalibratePrecision') or .1), .001)
    votes = {}
    for branch, node in source_nodes:
        pos = point(field(node, 'Position'))
        if not pos:
            continue
        for g in groups:
            if not relationship(branch, g['branch']):
                continue
            offset = tuple(a - b for a, b in zip(pos, g['point']))
            key = tuple(math.floor(v / precision + .5) for v in offset)
            votes.setdefault(key, []).append(offset)
    best = max(votes.values(), key=len, default=[])
    if len(best) >= max(math.floor(float(options.get('autoCalibrateMinSamples') or 2) + .5), 1):
        offset = tuple(sum(v[i] for v in best) / len(best) for i in range(3))
        for g in groups:
            g['point'] = tuple(a + b for a, b in zip(g['point'], offset))
    return groups
