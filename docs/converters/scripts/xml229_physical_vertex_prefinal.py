"""Independent source-connected XML229 nodal member replay for V2 pre-Final.

No accepted Worker choice, positive placeholder ID, distance matching or
snap-proximity grouping is trusted. This is invoked before native Final's
whole-XML and original physical-mass verification. No topology or kg mutation.
"""
from copy import deepcopy
from decimal import Decimal, InvalidOperation
import math
import json
import re
import xml.etree.ElementTree as ET

from xml229_prefinal_restraint_source import branch_name, branch_root
from xml229_prefinal_restraints import (
    field, children, local, kinds, append_profile, placeholder,
    present_type, node_type_mutation, numeric, source_gap,
)

POSITION_KEYS = ('SUPPORTCOORD', 'SUPPORT_COORD', 'POS', 'POSI', 'BPOS',
                 'APOS', 'LPOS', 'CPOS', 'HPOS', 'TPOS', 'SPOS', 'EPOS', 'DTXR_POS')
SUPPORT_TYPES = {'SUPPORT','ATTA','ANCI','REST','GUIDE','LINESTOP'}
NUMERIC = re.compile(r'^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?$')


def fail(code):
    raise ValueError('NATIVE_V2_' + code)


def abc(attrs, *aliases):
    normalized = {re.sub('[^A-Z0-9_]', '', str(k).upper()): v
                  for k, v in attrs.items()}
    for alias in aliases:
        v = normalized.get(re.sub('[^A-Z0-9_]', '', alias.upper()))
        if v is not None and str(v).strip() != '':
            return v
    return None


def triple(value):
    if isinstance(value, dict):
        value = [abc(value, 'x', 'E', 'east'),
                 abc(value, 'y', 'N', 'north'),
                 abc(value, 'z', 'Z', 'U', 'EL', 'elev', 'elevation')]
    elif isinstance(value, str):
        numeric=re.split(r'[\s,;]+',value.strip())
        if len(numeric)==3 and all(NUMERIC.fullmatch(part) for part in numeric):
            value=numeric
        else:
            directional=re.findall(
                r'\b(EL|E|W|N|S|U|D)\s*[:=]?\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)',
                value,re.I)
            if len(directional)!=3:
                return None
            components={}
            for axis,raw in directional:
                axis=axis.upper()
                index=0 if axis in ('E','W') else 1 if axis in ('N','S') else 2
                if index in components or (axis in ('W','S','D') and raw.startswith('-')):
                    return None
                signed='-'+raw if axis in ('W','S','D') else raw
                components[index]=signed
            if len(components)!=3:
                return None
            value=[components[i] for i in range(3)]
    if not isinstance(value, (list, tuple)) or len(value) != 3:
        return None
    try:
        parts = tuple(Decimal(str(v)) for v in value)
    except (InvalidOperation, ValueError, TypeError):
        return None
    return parts if all(v.is_finite() for v in parts) else None


def point(value, attrs, config):
    for key in POSITION_KEYS:
        raw = abc(attrs, key)
        if raw is None:
            continue
        p = triple(raw)
        if p is not None and key == 'POSI':
            datum = config.get('dtxrPositionOffset') or {}
            if datum.get('enabled') is True:
                try:
                    offset = tuple(Decimal(str(datum.get(k) or 0))
                                   for k in ('xOffset','yOffset','zOffset'))
                except InvalidOperation:
                    fail('DATUM_INVALID')
                if not all(v.is_finite() for v in offset):
                    fail('DATUM_INVALID')
                p = tuple(x+y for x,y in zip(p,offset))
        return True,p
    if 'position' in value or 'point' in value:
        return True,triple(value.get('position',value.get('point')))
    return False,None


def members(parsed, config):
    found=[]
    def visit(value, branch, inherited, depth):
        if depth>256:
            fail('JSON_HIERARCHY_DEPTH')
        if isinstance(value,list):
            for item in value:
                visit(item,branch,inherited,depth+1)
            return
        if not isinstance(value,dict):
            return
        attrs=value.get('attributes') or {}
        if not isinstance(attrs,dict):
            fail('SOURCE_ATTRIBUTES_INVALID')
        typ=str(value.get('type') or attrs.get('TYPE') or '').upper()
        if typ=='BRANCH':
            branch=str(value.get('name') or abc(attrs,'OWNER','BRANCH','PIPE') or branch)
        declared,direct=point(value,attrs,config)
        location=direct if declared else inherited
        code=str(abc(attrs,'MDSSUPPTYPE','CMPSUPTYPE') or '').upper()
        support=(typ in SUPPORT_TYPES or bool(re.match(r'^(GT|ST|AT)\d+',typ)))
        if not support and typ not in ('BRANCH','DTXR_POS','PIPE','ELBO','TEE',
                                         'OLET','VALV','FLAN','GASK'):
            support=code in SUPPORT_TYPES or bool(re.match(r'^(GT|ST|AT)\d+',code))
        if support:
            desc=str(abc(attrs,'DTXR','DESC','DESCRIPTION','SPRE') or
                     value.get('name') or '')
            chunks=[desc]
            if '|' in desc:
                chunks=[c.strip() for c in desc.split('|')]
                if any(not c for c in chunks):
                    fail('COMPOUND_EMPTY_MEMBER')
                if abc(attrs,'NODETYPE') is not None:
                    fail('COMPOUND_NODETYPE_UNSCOPED')
                if any(abc(attrs,k) is not None for k in
                       ('CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS','NODEGAP')):
                    if not all('CMPSUPGAP=' in c.upper().replace(' ','') for c in chunks):
                        fail('COMPOUND_GAP_UNSCOPED')
            for chunk in chunks:
                member_attrs=dict(attrs)
                if len(chunks)>1:
                    member_attrs.update(DTXR=chunk,DESC='',DESCRIPTION='')
                    for k in ('CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS','NODEGAP'):
                        member_attrs.pop(k,None)
                inline=re.search(r'CMPSUPGAP\s*=\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)',
                                 chunk,re.I)
                if inline and not any(member_attrs.get(k) for k in
                                      ('CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS')):
                    member_attrs['CMPSUPGAP']=inline.group(1)
                found.append(dict(branch=branch,point=location,attrs=member_attrs,
                                  desc='' if len(chunks)>1 else desc,
                                  type=typ))
        for child in value.get('children') or []:
            visit(child,branch,location,depth+1)
    visit(parsed,'',None,0)
    return found


def normalize_xml_position(node):
    return triple(field(node,'Position'))


def physical_vertices(root):
    branches=[b for b in root.iter() if local(b)=='Branch']
    index={}
    groups={}
    for bi,b in enumerate(branches):
        rows=children(b,'Node')
        last=None
        for ni,node in enumerate(rows):
            xyz=normalize_xml_position(node)
            if xyz is None:
                # No member can bind to an invalid original source position.
                current=(bi,ni)
            elif last and last[0] == ni-1 and last[1] == xyz:
                current=last[2]
            else:
                current=(bi,ni)
            index[(bi,ni)]=current
            groups.setdefault(current,[]).append((bi,ni,node))
            last=(ni,xyz,current)
    return branches,groups


def scoped(xml_branch,json_branch):
    if not json_branch:
        return True
    a,b=branch_name(xml_branch),branch_name(json_branch)
    return a==b if re.search(r'/B\d+$',b) else branch_root(a)==branch_root(b)


def sem(r):
    numeric_tags={'Stiffness','Gap','Friction','CMPSUPGAP',
                  'DirectionCosineX','DirectionCosineY','DirectionCosineZ'}
    pairs=[]
    for child in r:
        v=(child.text or '').strip()
        if local(child) in numeric_tags and v:
            try:
                d=Decimal(v)
                if d.is_finite():
                    v='0' if d==0 else str(d.normalize())
            except InvalidOperation:
                pass
        pairs.append((local(child),v))
    return (tuple(pairs),tuple(sorted(r.attrib.items())))


def replay_physical_vertex_prefinal(original, parsed, config, claimed, require):
    branches,groups=physical_vertices(original)
    station={}
    for vertex,rows in groups.items():
        xyz=normalize_xml_position(rows[0][2])
        if xyz is not None:
            station.setdefault(xyz,[]).append(vertex)
    assigned={}
    source_count=0
    slots=0
    for member in members(parsed,config):
        source_count+=1
        xyz=member['point']
        if xyz is None:
            fail('SOURCE_SUPPORT_UNBOUND')
        candidates={v for v in station.get(xyz,[]) if any(
            scoped(field(branches[b],'Branchname'),member['branch'])
            for b,_,_ in groups[v])}
        if len(candidates)!=1:
            fail('SOURCE_SUPPORT_UNBOUND')
        vertex=next(iter(candidates))
        # Existing mapper is independently replayed PER original member,
        # never Map(kind) across several engineering-distinct source rows.
        def require_member(ok,code):
            require(ok,code)
        evidence=kinds([member],require_member,config)
        if len(evidence)!=1:
            fail('SUPPORT_KIND_INVALID')
        kind,attrs=next(iter(evidence.items()))
        assigned.setdefault(vertex,[]).append((kind,attrs))
        slots+=1
        if len(assigned[vertex])>6:
            fail('SIX_SLOT_CAPACITY')
    skip=set()
    written=reused=removed=0
    for vertex,supports in assigned.items():
        carriers=[(b,i,n) for b,i,n in groups[vertex]
                  if field(n,'ComponentType').upper() in ('ATTA','ANCI')]
        if not carriers:
            fail('VERTEX_HAS_NO_SUPPORT_CARRIER')
        authored=[row for row in carriers
                  if any(not placeholder(r) for r in children(row[2],'Restraint'))]
        if len(authored)>1:
            fail('AUTHORED_RESTRAINT_ALIASES_CONFLICT')
        selected=authored[0] if authored else carriers[0]
        node=selected[2]
        skip.update(id(n) for _,_,n in carriers)
        expected=[]
        for kind,attrs in supports:
            tmp=deepcopy(node)
            for r in children(tmp,'Restraint'):
                tmp.remove(r)
            append_profile(tmp,kind,attrs,config)
            generated=children(tmp,'Restraint')
            if len(generated)!=1:
                fail('PROFILE_MUST_HAVE_ONE_SLOT')
            # V2 member-specific engineering fields override the fallback
            # profile. The original V1 replay remains untouched.
            restraint=generated[0]
            overrides={
                'Stiffness':abc(attrs,'STIFFNESS','NODESTIFFNESS'),
                'Friction':abc(attrs,'FRICTION','NODEFRICTION'),
            }
            for key,val in overrides.items():
                if val is not None:
                    target=next((c for c in restraint if local(c)==key),None)
                    if target is None:
                        fail('PROFILE_FIELD_MISSING')
                    target.text=str(val)
            direction=[abc(attrs,'DirectionCosineX','DIRECTIONCOSINEX'),
                       abc(attrs,'DirectionCosineY','DIRECTIONCOSINEY'),
                       abc(attrs,'DirectionCosineZ','DIRECTIONCOSINEZ')]
            if any(v is not None for v in direction):
                if any(v is None for v in direction):
                    fail('SOURCE_DIRECTION_INCOMPLETE')
                try:
                    vector=[float(v) for v in direction]
                    norm=math.sqrt(sum(v*v for v in vector))
                except (ValueError,TypeError,OverflowError):
                    fail('SOURCE_DIRECTION_INVALID')
                if not all(math.isfinite(v) for v in vector) or not norm:
                    fail('SOURCE_DIRECTION_INVALID')
                for axis,val in zip('XYZ',vector):
                    name='DirectionCosine'+axis
                    target=next((c for c in restraint if local(c)==name),None)
                    if target is None:
                        target=ET.SubElement(restraint,name)
                    target.text=f'{val/norm:.9f}'
            expected.append(restraint)
        desired=[sem(r) for r in expected]
        used=set()
        for current in children(node,'Restraint'):
            if placeholder(current):
                continue
            matching=next((i for i,v in enumerate(desired)
                           if i not in used and v==sem(current)),None)
            if matching is None:
                fail('AUTHORED_RESTRAINT_CONFLICT')
            used.add(matching)
            reused+=1
        for _,_,row in carriers:
            for restraint in children(row,'Restraint'):
                if placeholder(restraint):
                    row.remove(restraint)
                    removed+=1
                elif row is not node:
                    fail('AUTHORED_RESTRAINT_ALIASES_CONFLICT')
        remaining=[expected[i] for i in range(len(expected)) if i not in used]
        if len(children(node,'Restraint'))+len(remaining)>6:
            fail('SIX_SLOT_CAPACITY')
        for r in remaining:
            node.append(r)
            written+=1
    for branch in branches:
        for node in children(branch,'Node'):
            if field(node,'ComponentType').upper()!='ATTA' or id(node) in skip:
                continue
            entries=children(node,'Restraint')
            if not entries or all(placeholder(r) for r in entries):
                for r in entries:
                    node.remove(r)
                append_profile(node,'REST',{},config)
    expected_summary={
        'sourceSupportMembers':source_count,
        'boundSourceSupportMembers':source_count,
        'projectedSlotCount':slots,
        'canonicalPhysicalRestraintVertices':len(assigned),
        'writtenSlots':written,
        'reusedAuthoredSlots':reused,
        'removedZeroInformationPlaceholders':removed,
        'originalPositionsModified':0,
        'nativeCiiReleaseAuthorized':False,
    }
    require(claimed==expected_summary,'NATIVE_V2_MEMBER_CENSUS_DRIFT')
    return True
