"""Independent native implementation of the Step 3 restraint authority policy."""
import math
import re

DEFAULT_RESTRAINT_PRECEDENCE = {
    'nodeType': {'primary': 'supportMapper', 'fallback': 'review'},
    'gap': {'primary': 'json', 'fallback': 'supportMapper'},
    'stiffness': {'primary': 'supportMapper', 'fallback': 'review'},
    'friction': {'primary': 'json', 'fallback': 'supportMapper'},
}

def text(v):
    return '' if v is None else str(v).strip()

def missing(v):
    return v is None or bool(re.fullmatch(r'(?:|NULL|N/A|NA|NOT AVAILABLE|UNAVAILABLE)', text(v), re.I))

def fail(code):
    raise ValueError('NATIVE_PREFINAL_RESTRAINT_' + code)

def restraint_precedence(config):
    if 'xml229RestraintPrecedence' not in config:
        return None
    raw = config['xml229RestraintPrecedence']
    if not isinstance(raw, dict):
        fail('CONFIG_INVALID')
    result = {}
    for field, default in DEFAULT_RESTRAINT_PRECEDENCE.items():
        p = raw.get(field)
        if p is None:
            p = default
        if (not isinstance(p, dict) or p.get('primary') not in ('supportMapper','json')
            or p.get('fallback') not in ('supportMapper','json','review') or p['primary']==p['fallback']):
            fail('CONFIG_INVALID')
        result[field] = {'primary':p['primary'],'fallback':p['fallback']}
    return result

def json_node_type(attrs):
    raw = attrs.get('SOURCE_NODETYPE') if 'SOURCE_NODETYPE' in attrs else attrs.get('NODETYPE')
    return None if missing(raw) else raw

def node_type_uses_mapper(attrs, config):
    policy = restraint_precedence(config)
    if policy is None:
        return None
    p = policy['nodeType']
    return p['primary']=='supportMapper' or (missing(json_node_type(attrs)) and p['fallback']=='supportMapper')

def json_node_type_attrs(attrs, config):
    return {**attrs,'NODETYPE':json_node_type(attrs)} if restraint_precedence(config) else attrs

def number(raw, field):
    pattern = (r'(?:GAP\s*=\s*)?([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)\s*(?:mm)?(?:\s+gap)?'
               if field=='gap' else r'([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)')
    match = re.fullmatch(pattern,text(raw),re.I)
    n = float(match[1]) if match else float('nan')
    if not math.isfinite(n) or (n<=0 if field=='stiffness' else n<0 and n!=-1.0101 if field=='friction' else n<0):
        fail(field.upper()+'_INVALID')
    return n

def json_values(attrs, field, keys):
    values=[dict(attribute=k,raw=attrs[k],value=number(attrs[k],field)) for k in keys if not missing(attrs.get(k))]
    if values and any(v['value']!=values[0]['value'] for v in values):
        fail(field.upper()+'_AMBIGUOUS')
    return values[0] if values else None

def json_gap(attrs):
    catalogue=json_values(attrs,'gap',('CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS'))
    legacy_key='SOURCE_NODEGAP' if 'SOURCE_NODEGAP' in attrs else 'NODEGAP'
    legacy=json_values(attrs,'gap',(legacy_key,))
    profile_derived=text(attrs.get('SUPPORT_GAP_SOURCE')).upper()=='STEP7_KIND_PROFILE'
    if catalogue and legacy and legacy['value']!=0 and legacy['value']!=catalogue['value']:
        fail('GAP_AMBIGUOUS')
    if profile_derived and legacy and legacy['value']!=0 and not catalogue:
        fail('GAP_AMBIGUOUS')
    selected=catalogue or (legacy if not profile_derived else None)
    if selected and not missing(attrs.get('SUPPORT_EFFECTIVE_GAP')) and not profile_derived and number(attrs['SUPPORT_EFFECTIVE_GAP'],'gap')!=selected['value']:
        fail('GAP_AMBIGUOUS')
    return selected

def choose(p, field, from_json, from_mapper):
    for src in (p['primary'],p['fallback']):
        if src=='review':
            break
        result=from_json() if src=='json' else from_mapper()
        if result:
            return {**result,'authority':'original-json' if src=='json' else 'support-profile/config','policy':'xml229RestraintPrecedence.'+field}
    fail(field.upper()+'_INVALID')

def select_restraint_gap(attrs, config, kind, profile):
    policy=restraint_precedence(config)
    if not policy or not kind:
        return None
    def mapper():
        raw=profile.get('gap')
        return None if missing(raw) else dict(attribute=None,raw=raw,value=number(raw,'gap'))
    return choose(policy['gap'],'gap',lambda:json_gap(attrs),mapper)

def select_restraint_scalar(attrs, config, field, kind, profile):
    policy=restraint_precedence(config)
    if not policy:
        return None
    def source():
        direct=('STIFFNESS','NODESTIFFNESS','CMPSUPSTIFF') if field=='stiffness' else ('FRICTION','CMPSUPFRICTION')
        row=json_values(attrs,field,direct) or json_values(attrs,field,('NODESTIFF' if field=='stiffness' else 'NODEFRICTION',))
        return None if field=='friction' and row and row['value']==0 else row
    def mapper():
        if field=='stiffness':
            raw=profile.get('stiffness')
            if not raw or raw=='default':
                raw=config.get('defaultStiffness')
                if raw is None:
                    raw='1.751270E+12'
        elif profile.get('frictionMode')=='fixed':
            raw=profile.get('fixedFriction')
        elif profile.get('frictionMode')=='sentinel' and config.get('useFrictionSentinelForNonYSupports') is not False and kind!='REST':
            raw='-1.010100'
        else:
            raw=config.get('defaultFriction')
            if raw is None:
                raw='0.3'
        return None if missing(raw) else dict(attribute=None,raw=raw,value=number(raw,field))
    return choose(policy[field],field,source,mapper)
