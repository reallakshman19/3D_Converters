"""Independent replay of Step 7 Support Type Mapper aliases for native Final.

Source rows come from saved supportTypeMapper.rows, not from a claimed Worker
resolution. Non-REST/GUIDE/LINESTOP targets never fabricate governed restraints.
"""
import json
import math
import re

_LOW = {'GT', 'ST', 'PG', 'LS'}
_HIGH = {'SHOE','PIPEREST','WEARPAD','REST','RES','GUIDE',
         'LATERALGUIDE','LINESTOP','DIRECTIONALANCHOR','AXIALSTOP','ANCHOR','FIXED'}


def _norm(value):
    return re.sub(r'[^A-Z0-9]', '', str(value or '').upper())


def _match_alias(source, alias):
    key, pattern = _norm(alias), str(alias or '').upper().strip()
    if not key or not pattern:
        return None
    if '*' in pattern:
        rx = '.*'.join(re.escape(piece) for piece in pattern.split('*'))
        return .75 if re.search(rx, source) else None
    if pattern in _LOW:
        rx = r'(?:^|[^A-Z0-9])' + re.escape(pattern) + r'[A-Z0-9_-]*(?=$|[^A-Z0-9])'
        return .45 if re.search(rx, source) else None
    if pattern == 'RES' and not re.search(r'(?:^|[^A-Z0-9])RES(?=$|[^A-Z0-9])', source):
        return None
    if key not in _norm(source):
        return None
    return .98 if key in _HIGH else .9 if len(key) >= 6 else .75



def configured_support_rule(attrs, description, config, require):
    """Replay saved Tab 8 custom rule/regex directly from original source fields.

    Built-in and generated Tab 7 prefix rules retain their existing fallback
    roles; user-authored rules are evaluated by explicit priority, with
    equal-priority conflicting kinds rejected rather than guessed.
    """
    mapping = config.get('supportMapping') or {}
    rows = mapping.get('rules')
    if not isinstance(rows, list):
        return ''
    values = dict(attrs)
    values.setdefault('DESCRIPTION', description)
    matches = []
    for index, rule in enumerate(rows):
        if not isinstance(rule, dict) or rule.get('enabled') is False:
            continue
        ident = str(rule.get('id') or '')
        if ident.startswith(('builtin-', 'standalone-mds-')):
            continue
        scope = str(rule.get('source') or '').lower().strip()
        if scope not in ('', 'all', 'staged-json', 'json'):
            continue
        kind = str(rule.get('kind') or '').upper().replace(' ', '')
        if not kind:
            continue
        mode = str(rule.get('match') or 'contains')
        require(mode in ('regex', 'contains', 'equals', 'startsWith'),
                'NATIVE_PREFINAL_RESTRAINT_CONFIG_INVALID')
        fields = [('*' if f.strip() == '*' else
                   re.sub(r'[^A-Z0-9]', '', f.upper())) for f in
                  re.split(r'[,;\n]', str(rule.get('field') or '')) if f.strip()]
        candidates = [str(v) for k,v in values.items()
                      if v is not None and (not fields or '*' in fields or
                      'ANY' in fields or re.sub(r'[^A-Z0-9]', '', k.upper()) in fields)
                      and str(v).strip()]
        pattern = str(rule.get('pattern') or '').strip()
        if not pattern:
            continue
        if mode == 'regex':
            require(len(pattern) <= 512, 'NATIVE_PREFINAL_RESTRAINT_CONFIG_INVALID')
            try:
                expression = re.compile(pattern, re.I)
            except re.error:
                require(False, 'NATIVE_PREFINAL_RESTRAINT_CONFIG_INVALID')
            found = any(expression.search(v) for v in candidates)
        else:
            terms = [v.strip().upper() for v in re.split(r'[,;\n]', pattern) if v.strip()]
            found = any(any(
                c.upper() == term if mode == 'equals' else
                c.upper().startswith(term) if mode == 'startsWith' else
                term in c.upper() for term in terms) for c in candidates)
        if found:
            priority = rule.get('priority', (index+1)*10)
            try:
                priority = float(priority)
            except (ValueError, TypeError):
                priority = (index+1)*10
            if not __import__('math').isfinite(priority):
                priority = (index+1)*10
            matches.append((priority, kind, ident or 'rule-'+str(index)))
    if not matches:
        return ''
    matches.sort(key=lambda item: (item[0], item[2]))
    best = matches[0][0]
    first = {kind for priority, kind, _ in matches if priority == best}
    require(len(first) == 1, 'NATIVE_PREFINAL_RESTRAINT_KIND_AMBIGUOUS')
    return next(iter(first))


_DEFAULT_KIND_ALIASES = {
    'REST': {'SHOE','PIPEREST','WEARPAD','REST','RES'},
    'GUIDE': {'GUIDE','PG','LATERALGUIDE','GT'},
    'LINESTOP': {'LINESTOP','DIRECTIONALANCHOR','LS','AXIALSTOP','ST'},
    'ANCHOR': {'ANCHOR','FIXED'},
}


def configured_mapper_semantic_conflict(attrs, description, config, semantic, require):
    """Detect newly configured Tab 7 keywords that contradict source semantics.

    Default cross-kind hardware terms (e.g. SHOE in a DIRECTIONAL ANCHOR)
    do not become a false contradiction.
    """
    rows = (config.get('supportTypeMapper') or {}).get('rows')
    if not isinstance(rows, list) or not semantic:
        return
    # Same description rule as kinds() and the JS closure: MDSDTXR stands in
    # when DTXR/DESC/DESCRIPTION are all blank.
    primary = [attrs.get('DTXR'), attrs.get('DESC'), attrs.get('DESCRIPTION')]
    if not any(str(v or '').strip() for v in primary):
        primary = [attrs.get('MDSDTXR')]
    source = ' '.join(str(v) for v in
        primary + [description, attrs.get('CMPSUPTYPE'), attrs.get('MDSSUPPTYPE'),
                   attrs.get('SPRE')] if v).upper()
    for row in rows:
        if not isinstance(row, dict):
            continue
        kind = str(row.get('kind') or '').upper()
        if kind == semantic:
            continue
        for alias in row.get('aliases') or []:
            if _norm(alias) in _DEFAULT_KIND_ALIASES.get(kind, set()):
                continue
            score = _match_alias(source, alias)
            if score is not None and score >= 0.65:
                require(False, 'NATIVE_PREFINAL_RESTRAINT_KIND_AMBIGUOUS')


def mapped_support_kind(attrs, description, config, require):
    rows = (config.get('supportTypeMapper') or {}).get('rows')
    if not isinstance(rows, list):
        return '', 0
    source = ' '.join(str(v) for v in
        [attrs.get('DTXR'),attrs.get('DESC'),attrs.get('DESCRIPTION'),
         description,attrs.get('CMPSUPTYPE'),attrs.get('MDSSUPPTYPE'),
         attrs.get('SPRE')] if v).upper()
    primary = bool(re.search(r'\b(?:LINE\s*STOP|LINESTOP|AXIAL\s*STOP|'
                             r'DIRECTIONAL\s+ANCHOR|LATERAL\s+GUIDE|GUIDE)\b', source))
    matches = []
    for row in rows:
        kind = str(row.get('kind') or '').upper() if isinstance(row, dict) else ''
        if not kind:
            continue
        for alias in row.get('aliases') or []:
            score = _match_alias(source, alias)
            if score is not None:
                if primary and kind == 'REST' and _norm(alias) in ('WEARPAD','SHOE'):
                    score = .75
                matches.append((score, kind))
    if not matches:
        return '', 0
    strongest = max(score for score, kind in matches)
    winners = {kind for score, kind in matches if abs(score - strongest) < 1e-9}
    require(len(winners) == 1, 'NATIVE_PREFINAL_RESTRAINT_KIND_AMBIGUOUS')
    return next(iter(winners)), strongest


# ---------------------------------------------------------------------------
# Owner rule (12 Nov, RCA-04): source NODETYPE wins; otherwise the Step 7
# support table ("Use JSON/support mapper for restraints"). Line-for-line
# mirror of converters/xml-cii2019-core/support-kind-precedence.js
# (governedSupportKind); tests/xml-cii-support-kind-owner-precedence.test.mjs
# checks the two agree on a shared case list and that these rows equal JS.
# ---------------------------------------------------------------------------
TABLE_REQUIRED_RULES = json.loads(r'''[
 {
  "id": "builtin-user-limit",
  "priority": 10,
  "field": "SPRE,SKEY,NAME,DESCRIPTION,DESC,CMPSUPTYPE,DTXR,SUPPORT_TYPE,SUPPORT_KIND,SUPPORT_MAPPER_KIND,MDSSUPPTYPE",
  "pattern": "\\b(?:LINE\\s*STOP|LIMIT\\s*STOP|AXIAL\\s*STOP|DIRECTIONAL\\s+ANCHOR)\\b",
  "match": "regex",
  "kind": "LINESTOP",
  "enabled": true
 },
 {
  "id": "builtin-user-guide",
  "priority": 20,
  "field": "SPRE,SKEY,NAME,DESCRIPTION,DESC,CMPSUPTYPE,DTXR,SUPPORT_TYPE,SUPPORT_KIND,SUPPORT_MAPPER_KIND,MDSSUPPTYPE",
  "pattern": "GUIDE",
  "match": "contains",
  "kind": "GUIDE",
  "enabled": true
 },
 {
  "id": "builtin-user-rest",
  "priority": 30,
  "field": "SPRE,SKEY,NAME,DESCRIPTION,DESC,CMPSUPTYPE,DTXR,SUPPORT_TYPE,SUPPORT_KIND,SUPPORT_MAPPER_KIND,MDSSUPPTYPE",
  "pattern": "REST,SHOE,BP,BEARING PLATE,WP,WEAR PAD,ANCI",
  "match": "contains",
  "kind": "REST",
  "enabled": true
 },
 {
  "id": "builtin-atta-rest",
  "priority": 40,
  "field": "ComponentType,COMPONENTTYPE",
  "pattern": "ATTA",
  "match": "equals",
  "kind": "REST",
  "enabled": true
 }
]''')
TABLE_DEFAULT_RULES = json.loads(r'''[
 {
  "id": "builtin-user-rest",
  "field": "SPRE,SKEY,NAME,DESCRIPTION,DESC,CMPSUPTYPE",
  "pattern": "REST,SHOE,BP,BEARING PLATE,WP,WEAR PAD,ANCI",
  "match": "contains",
  "kind": "REST",
  "label": "REST/SHOE/BP/WP/ANCI -> REST"
 },
 {
  "id": "builtin-user-limit",
  "field": "SPRE,SKEY,NAME,DESCRIPTION,DESC,CMPSUPTYPE",
  "pattern": "LIMIT STOP,AXIAL STOP,LINE STOP,DIRECTIONAL ANCHOR",
  "match": "contains",
  "kind": "LINESTOP",
  "label": "LINE/LIMIT/AXIAL STOP/DIRECTIONAL ANCHOR -> LINESTOP"
 },
 {
  "id": "builtin-user-guide",
  "field": "SPRE,SKEY,NAME,DESCRIPTION,DESC,CMPSUPTYPE",
  "pattern": "GUIDE",
  "match": "contains",
  "kind": "GUIDE",
  "label": "GUIDE -> GUIDE"
 },
 {
  "id": "builtin-ca150",
  "field": "SKEY",
  "pattern": "CA150",
  "match": "equals",
  "kind": "REST",
  "label": "SKEY CA150 -> REST"
 },
 {
  "id": "builtin-ca250",
  "field": "SKEY",
  "pattern": "CA250",
  "match": "equals",
  "kind": "REST",
  "label": "SKEY CA250 -> REST"
 },
 {
  "id": "builtin-ca100",
  "field": "SKEY",
  "pattern": "CA100",
  "match": "equals",
  "kind": "GUIDE",
  "label": "SKEY CA100 -> GUIDE"
 },
 {
  "id": "builtin-pg",
  "field": "CMPSUPTYPE",
  "pattern": "PG-",
  "match": "startsWith",
  "kind": "GUIDE",
  "label": "PG-* -> GUIDE"
 },
 {
  "id": "builtin-ls",
  "field": "CMPSUPTYPE",
  "pattern": "LS-",
  "match": "startsWith",
  "kind": "LINESTOP",
  "label": "LS-* -> LINESTOP"
 },
 {
  "id": "builtin-bp",
  "field": "CMPSUPTYPE",
  "pattern": "BP-",
  "match": "startsWith",
  "kind": "REST",
  "label": "BP-* -> REST"
 },
 {
  "id": "builtin-g",
  "field": "CMPSUPTYPE",
  "pattern": "G-",
  "match": "startsWith",
  "kind": "GUIDE",
  "label": "G-* -> GUIDE"
 },
 {
  "id": "builtin-rest",
  "field": "CMPSUPTYPE",
  "pattern": "REST",
  "match": "equals",
  "kind": "REST",
  "label": "REST -> REST"
 },
 {
  "id": "builtin-gt5-cmp",
  "field": "CMPSUPTYPE",
  "pattern": "GT5",
  "match": "startsWith",
  "kind": "GUIDE",
  "label": "CMPSUPTYPE GT5* -> GUIDE"
 },
 {
  "id": "builtin-gt5-mds",
  "field": "MDSSUPPTYPE",
  "pattern": "GT5",
  "match": "startsWith",
  "kind": "GUIDE",
  "label": "MDSSUPPTYPE GT5* -> GUIDE"
 },
 {
  "id": "builtin-gt-mds",
  "field": "MDSSUPPTYPE",
  "pattern": "GT",
  "match": "startsWith",
  "kind": "GUIDE",
  "label": "GT* -> GUIDE"
 },
 {
  "id": "builtin-bt",
  "field": "MDSSUPPTYPE",
  "pattern": "BT",
  "match": "startsWith",
  "kind": "REST",
  "label": "BT* -> REST"
 },
 {
  "id": "builtin-an",
  "field": "MDSSUPPTYPE",
  "pattern": "AN",
  "match": "startsWith",
  "kind": "ANCHOR",
  "label": "AN* -> ANCHOR"
 },
 {
  "id": "builtin-pipe-rest",
  "field": "MDSSUPPTYPE",
  "pattern": "PIPE-REST",
  "match": "equals",
  "kind": "REST",
  "label": "PIPE-REST -> REST"
 },
 {
  "id": "builtin-gt5-text",
  "field": "SPRE,SKEY,NAME,DESCRIPTION,DESC",
  "pattern": "GT5",
  "match": "contains",
  "kind": "GUIDE",
  "label": "Text contains GT5 -> GUIDE"
 },
 {
  "id": "builtin-spre-guide",
  "field": "SPRE",
  "pattern": "GT01,GT02,GT03,GT04",
  "match": "contains",
  "kind": "GUIDE",
  "label": "SPRE GT01/GT02/GT03/GT04 -> GUIDE"
 },
 {
  "id": "builtin-spre-linestop",
  "field": "SPRE",
  "pattern": "ST06,ST07,ST08",
  "match": "contains",
  "kind": "LINESTOP",
  "label": "SPRE ST06/ST07/ST08 -> LINESTOP"
 },
 {
  "id": "builtin-spre-rest",
  "field": "SPRE",
  "pattern": "PIPE-REST,AT01,AT02,AT03,AT04,AT05",
  "match": "contains",
  "kind": "REST",
  "label": "SPRE PIPE-REST/AT0x -> REST"
 }
]''')
_TABLE_SUPPORT_KINDS = ('REST', 'GUIDE', 'LINESTOP', 'LIMIT', 'ANCHOR', 'SPRING')
_TABLE_MATCH_TYPES = ('startsWith', 'equals', 'contains', 'regex')
# Only the member's own description and code fields: never SPRE/NAME catalogue
# paths (a path like /MDS-Ancillaries/ANCI/... must not make a stop a REST).
_TABLE_FIELDS = ('DTXR', 'DESC', 'DESCRIPTION', 'MDSDTXR', 'CMPSUPTYPE', 'MDSSUPPTYPE',
                 'SKEY', 'COMPONENTTYPE')
_GENERATED_FIELDS = ('SUPPORTKIND', 'SUPPORTMAPPERKIND', 'SUPPORTTYPE')
_DESCRIPTION_KEYS = ('DTXR', 'DESC', 'DESCRIPTION')


def _owner_text(value):
    return '' if value is None else str(value).strip()


def _owner_key(key):
    return re.sub(r'[^A-Z0-9]', '', _owner_text(key).upper())


def _owner_fields(attrs):
    out = {}
    for key, value in (attrs or {}).items():
        if isinstance(value, (dict, list, tuple)):
            continue
        name = _owner_key(key)
        if name not in out and _owner_text(value):
            out[name] = _owner_text(value)
    return out


def _table_match(match):
    raw = _owner_text(match)
    if raw in _TABLE_MATCH_TYPES:
        return raw
    lower = raw.lower()
    if lower in ('startswith', 'starts-with'):
        return 'startsWith'
    return lower if lower in _TABLE_MATCH_TYPES else 'contains'


def _table_kind(kind):
    value = re.sub(r'\s+', '', _owner_text(kind).upper())
    return value if value in _TABLE_SUPPORT_KINDS else 'REST'


def _split_terms(value):
    return [t.strip() for t in re.split(r'[,;\n]+', str(value or '')) if t.strip()]


def _field_name(name):
    trimmed = str(name or '').strip()
    if trimmed == '*':
        return '*'
    return re.sub(r'[^A-Z0-9]', '', re.sub(r'^<+|>+$', '', trimmed).upper())


def _rule_values(evidence, rule):
    wanted = [_field_name(f) for f in _split_terms(rule['field'])]
    if not wanted or '*' in wanted or 'ANY' in wanted:
        return [v for v in evidence.values() if str(v).strip()]
    return [v for k, v in evidence.items() if k in wanted and str(v).strip()]


def _kind_from_text(value):
    t = str(value or '').upper()
    if re.search(r'\bDIRECTIONAL\s+ANCHOR\b|\bLINE\s*STOP\b|\bLINESTOP\b|\bLIMIT\s*STOP\b|\bAXIAL\s*STOP\b', t):
        return 'LINESTOP'
    if re.search(r'\bANC(HOR)?\b|\bFIX(ED)?\b|\bRIGID\b', t):
        return 'ANCHOR'
    if re.search(r'\bGUIDE\b|\bGDE\b|\bGUI\b|\bSLIDE\b|\bSLID\b|\bLATERAL\b', t):
        return 'GUIDE'
    if re.search(r'\bSPRING\b|\bHANGER\b', t):
        return 'SPRING'
    if re.search(r'\bREST(ING)?\b|\bRST\b|\bSHOE\b|\bBASE\s*PLATE\b|\bBEARING\s*PLATE\b|\bWEAR\s*PAD\b|\bBP\b|\bWP\b|\bANCI\b|\+Y\b', t):
        return 'REST'
    return ''


def _js_number(value):
    """JavaScript Number(value) for a rule priority; None when not finite."""
    if value is None:
        return 0.0
    if isinstance(value, bool):
        return 1.0 if value else 0.0
    if isinstance(value, (int, float)):
        return float(value) if math.isfinite(value) else None
    s = str(value).strip()
    if s == '':
        return 0.0
    for prefix, base in (('0x', 16), ('0o', 8), ('0b', 2)):
        if s.lower().startswith(prefix):
            try:
                return float(int(s[2:], base))
            except ValueError:
                return None
    if re.fullmatch(r'[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?', s):
        return float(s)
    return None


_STAGED_SOURCES = ('', 'ALL', 'STAGED-JSON', 'JSON')
_REGEX_OUTSIDE_SUBSET = re.compile(r'\(\?(?![:=!]|<[=!])|\\[AZzGpPk]|\$\{|\(\?P')


def table_rules(config):
    """Enabled Step 7 rows for staged JSON, in priority order (as JS tableRules)."""
    mapping = (config or {}).get('supportMapping')
    version = _js_number(mapping.get('version')) if isinstance(mapping, dict) and 'version' in mapping else None
    source = (mapping.get('rules') if isinstance(mapping.get('rules'), list) else []) \
        if version is not None and version >= 2 else TABLE_DEFAULT_RULES
    by_id = {_owner_text(r.get('id')): r for r in source if isinstance(r, dict) and _owner_text(r.get('id'))}
    required_ids = {r['id'] for r in TABLE_REQUIRED_RULES}
    merged = [{**by_id.get(r['id'], {}), **r,
               'enabled': False if by_id.get(r['id'], {}).get('enabled') is False else r['enabled']}
              for r in TABLE_REQUIRED_RULES]
    merged += [r for r in source if not (isinstance(r, dict) and _owner_text(r.get('id')) in required_ids)]
    rows = []
    for index, rule in enumerate(merged):
        rule = rule if isinstance(rule, dict) else {}
        priority = _js_number(rule.get('priority')) if 'priority' in rule else None
        if priority is None:
            priority = float((index + 1) * 10)
        if rule.get('enabled') is False:
            continue
        if _owner_text(rule.get('source') or 'all').upper() not in _STAGED_SOURCES:
            continue
        rows.append({'id': _owner_text(rule.get('id')) or 'support-rule-%d' % (index + 1),
                     'priority': priority, 'field': _owner_text(rule.get('field') or '*') or '*',
                     'match': _table_match(rule.get('match')), 'pattern': _owner_text(rule.get('pattern')),
                     'kind': _table_kind(rule.get('kind'))})
    return sorted(rows, key=lambda r: r['priority'])


def _rule_regex(rule):
    pattern = rule['pattern'].strip()
    if len(pattern) > 512 or _REGEX_OUTSIDE_SUBSET.search(pattern):
        raise ValueError('NATIVE_PREFINAL_RESTRAINT_CONFIG_INVALID')
    try:
        return re.compile(pattern, re.IGNORECASE)
    except re.error:
        raise ValueError('NATIVE_PREFINAL_RESTRAINT_CONFIG_INVALID') from None


def _rule_matches(rule, value):
    raw = str(value)
    upper = raw.upper()
    if rule['match'] == 'regex':
        return rule['pattern'].strip() != '' and bool(_rule_regex(rule).search(raw))
    for p in _split_terms(rule['pattern']):
        up = p.upper()
        if rule['match'] == 'startsWith' and upper.startswith(up):
            return True
        if rule['match'] == 'equals' and upper == up:
            return True
        if rule['match'] == 'contains' and up in upper:
            return True
    return False


def table_support_kind(attrs, config, only_user_rows=False):
    f = _owner_fields(attrs)
    evidence = {k: f[k] for k in _TABLE_FIELDS if f.get(k)}
    if not any(evidence.get(k) for k in _DESCRIPTION_KEYS) and evidence.get('MDSDTXR'):
        evidence['DESCRIPTION'] = evidence['MDSDTXR']
    first = None
    rules = [r for r in table_rules(config)
             if not only_user_rows or not re.match(r'^(?:builtin-|standalone-mds-)', r['id'])]
    for rule in rules:
        if first is not None and rule['priority'] != first['priority']:
            break
        if not any(_rule_matches(rule, v) for v in _rule_values(evidence, rule)):
            continue
        if first is None:
            first = rule
        elif rule['kind'] != first['kind']:
            raise ValueError('NATIVE_PREFINAL_RESTRAINT_KIND_AMBIGUOUS')
    if first is not None:
        return first['kind']
    if only_user_rows:
        return ''
    return _kind_from_text(' '.join(str(v) for v in evidence.values()))


def node_type_user_row_conflict(attrs, config, node_type_kind,
                                governed=('REST', 'GUIDE', 'LINESTOP')):
    """A user-authored Step 7 row naming another governed kind than NODETYPE is refused."""
    user_kind = table_support_kind(attrs, config or {}, only_user_rows=True)
    if user_kind in governed and user_kind != node_type_kind:
        raise ValueError('NATIVE_PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT')


def described_kinds(attrs):
    f = _owner_fields(attrs)
    primary = [f[k] for k in _DESCRIPTION_KEYS if f.get(k)]
    desc = (' '.join(primary) if primary else f.get('MDSDTXR', '')).upper()
    stop = bool(re.search(r'\b(?:PIPE\s*STOP|LINE\s*STOP|LINESTOP|LIMIT\s*STOP|AXIAL\s*STOP|DIRECTIONAL\s+ANCHOR)\b', desc))
    guide = bool(re.search(r'\bGUIDE\b', desc))
    rest = bool(re.search(r'\b(?:PIPE[- ]?REST|REST)\b', desc)) or (
        not stop and not guide and bool(re.search(r'\bSHOE\b', desc)))
    return [k for k, on in (('LINESTOP', stop), ('GUIDE', guide), ('REST', rest)) if on]


def owner_rule_kind(attrs, config, governed=('REST', 'GUIDE', 'LINESTOP')):
    """Table part of the Owner rule (NODETYPE is decided by the caller first).

    Returns (kind, source); kind '' means: leave it to the caller's fail-closed chain.
    """
    described = described_kinds(attrs)
    if len(described) > 1:
        return '', 'description-conflict'
    by_table = table_support_kind(attrs, config or {})
    if by_table:
        if len(described) == 1 and by_table != described[0]:
            return '', 'description-conflict'
        return (by_table, 'step7-support-table') if by_table in governed else ('', 'step7-not-governed')
    f = _owner_fields(attrs)
    for key in _GENERATED_FIELDS:
        kind = re.sub(r'\s+', '', f.get(key, '').upper())
        if kind:
            return (kind, 'generated-label') if kind in governed else ('', '')
    return '', ''
