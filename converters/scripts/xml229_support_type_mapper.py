"""Independent replay of Step 7 Support Type Mapper aliases for native Final.

Source rows come from saved supportTypeMapper.rows, not from a claimed Worker
resolution. Non-REST/GUIDE/LINESTOP targets never fabricate governed restraints.
"""
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
                matches.append((score, kind, str(alias)))
    if not matches:
        return '', 0
    strongest = max(score for score, _kind, _alias in matches)
    tied = [item for item in matches if abs(item[0] - strongest) < 1e-9]
    # Mirror the browser's specific-alias dominance. A configured
    # DIRECTIONAL ANCHOR outranks the overlapping generic ANCHOR at equal
    # score; unrelated equal-strength kinds remain ambiguous/fail closed.
    winners = {kind for score, kind, alias in tied
               if not any(other_kind != kind and '*' not in other_alias
                          and '*' not in alias
                          and len(_norm(other_alias)) > len(_norm(alias))
                          and _norm(alias) in _norm(other_alias)
                          for _, other_kind, other_alias in tied)}
    require(len(winners) == 1, 'NATIVE_PREFINAL_RESTRAINT_KIND_AMBIGUOUS')
    return next(iter(winners)), strongest
