"""Independent native graph custody for the source-zero-edge contraction audit.

Never trust Worker candidate groups or allow two adjacent zero-length rows
to be assigned the same CII node number without a reviewed source contraction.
This is a receipt verifier only, not a topology mutator.
"""
from decimal import Decimal, InvalidOperation
import json
import re
import xml.etree.ElementTree as ET

SCHEMA = 'XML229.PreAcceptanceVertexContractionAudit.v1'


def local(element):
    return str(element.tag).split('}')[-1]


def children(e, name):
    return [c for c in e if local(c) == name]


def field(e, name):
    c = next(iter(children(e,name)), None)
    return (c.text or '').strip() if c is not None else ''


def position(raw):
    values=raw.split()
    if len(values)!=3:
        return None
    try:
        xyz=tuple(Decimal(s) for s in values)
    except (InvalidOperation, ValueError):
        return None
    return xyz if all(s.is_finite() for s in xyz) else None


def source_key(bi,oi):
    return json.dumps([bi,oi],separators=(',', ':'))


def require(ok,code):
    if not ok:
        raise ValueError(code)


def expected_audit(original,final,retained,aliases,source_sha):
    ob=[b for b in original.iter() if local(b)=='Branch']
    fb=[b for b in final.iter() if local(b)=='Branch']
    require(isinstance(retained,list) and len(ob)==len(fb)==len(retained),
            'NATIVE_CONTRACTION_BRANCH_CENSUS')
    rows=[]
    parent=[]
    lookup={}
    for bi,branch in enumerate(ob):
        previous=None
        for oi,node in enumerate(children(branch,'Node')):
            p=position(field(node,'Position'))
            index=len(rows)
            parent.append(index)
            row=dict(branchOccurrenceIndex=bi,sourceNodeOrdinal=oi,
                     sourceNodeNumber=field(node,'NodeNumber'),
                     sourceComponentType=field(node,'ComponentType').upper(),
                     sourceEndpoint=field(node,'Endpoint'),
                     positionRaw=field(node,'Position'),coordinateKey=p)
            rows.append(row)
            lookup[(bi,oi)]=index
            if previous is not None and p is not None and rows[previous]['coordinateKey']==p:
                parent[index]=root(parent,previous)
            previous=index
    if not isinstance(aliases,list):
        raise ValueError('NATIVE_CONTRACTION_ALIASES_INVALID')
    visited=set()
    for alias in aliases:
        key=(alias.get('aliasBranchOccurrenceIndex'),alias.get('aliasSourceNodeOrdinal'))
        other=(alias.get('terminalBranchOccurrenceIndex'),alias.get('terminalSourceNodeOrdinal'))
        require(key not in visited,'NATIVE_CONTRACTION_ALIAS_DUPLICATED')
        visited.add(key)
        require(key in lookup and other in lookup,'NATIVE_CONTRACTION_ALIAS_UNKNOWN')
        a=lookup[key];b=lookup[other]
        require(rows[a]['coordinateKey'] is not None and
                rows[a]['coordinateKey']==rows[b]['coordinateKey'],
                'NATIVE_CONTRACTION_ALIAS_POSITION')
        x,y=root(parent,a),root(parent,b)
        if x!=y:
            parent[max(x,y)]=min(x,y)
    vertex_by_index=[
        source_key(rows[root(parent,i)]['branchOccurrenceIndex'],
                   rows[root(parent,i)]['sourceNodeOrdinal'])
        for i in range(len(rows))]
    vertex_groups={}
    for i,row in enumerate(rows):
        vertex_groups.setdefault(vertex_by_index[i],[]).append(row)
    fl={}
    final_ids={}
    for bi,branch in enumerate(fb):
        found=children(branch,'Node')
        ordinals=retained[bi]
        require(isinstance(ordinals,list) and len(found)==len(ordinals),
                'NATIVE_CONTRACTION_RETAINED_CENSUS')
        prev=-1
        for ordinal,node in zip(ordinals,found):
            require(type(ordinal) is int and (bi,ordinal) in lookup and ordinal>prev,
                    'NATIVE_CONTRACTION_ORDINAL_DRIFT')
            prev=ordinal
            source=rows[lookup[(bi,ordinal)]]
            require(field(node,'Position')==source['positionRaw'],
                    'NATIVE_CONTRACTION_ORIGINAL_POSITION_DRIFT')
            val=field(node,'NodeNumber')
            require(bool(re.fullmatch(r'[0-9]+',val)) and 0<int(val)<=2147483647,
                    'NATIVE_CONTRACTION_FINAL_ID_INVALID')
            number=int(val)
            key=(bi,ordinal)
            fl[key]=dict(sourceNodeOrdinal=ordinal,finalNodeNumber=number,
                         finalizedAuthoredRestraints=len(children(node,'Restraint')))
            final_ids.setdefault(number,set()).add(vertex_by_index[lookup[key]])
    candidates=[]
    retained_edges=0
    pruned_edges=0
    premature=0
    for vertex,group in vertex_groups.items():
        if len(group)<2:
            continue
        branches={}
        for row in group:
            branches.setdefault(row['branchOccurrenceIndex'],[]).append(row)
        for bi,items in branches.items():
            ordered=sorted(items,key=lambda x:x['sourceNodeOrdinal'])
            def flush(run):
                nonlocal retained_edges,pruned_edges,premature
                if len(run)<2:
                    return
                ids=[r['sourceNodeOrdinal'] for r in run]
                finals=[fl[(bi,oi)] for oi in ids if (bi,oi) in fl]
                native_ids=[f['finalNodeNumber'] for f in finals]
                positive=list(dict.fromkeys(
                    n for r in run for n in [int(r['sourceNodeNumber'])]
                    if n>0
                ))
                retained_all=len(finals)==len(run)
                status='SOURCE_ZERO_EDGE_RETAINED' if retained_all else 'SOURCE_ZERO_EDGE_ALREADY_PRUNED'
                if retained_all:
                    retained_edges+=len(run)-1
                else:
                    pruned_edges+=len(run)-1
                reasons=[]
                if len(positive)>1:
                    reasons.append('CONFLICTING_AUTHORED_POSITIVE_IDENTITIES')
                if retained_all:
                    reasons.append('ZERO_LENGTH_SOURCE_EDGE_MUST_CONTRACT')
                if any(r['sourceComponentType'] in ('VALV','FLAN','INST','RIGID') or
                       r['sourceEndpoint'] in ('1','2') for r in run):
                    reasons.append('RIGID_OR_COMPONENT_ENDPOINT_REVIEW_REQUIRED')
                if any(r['finalizedAuthoredRestraints']>0 for r in finals):
                    reasons.append('NODAL_SLOTS_REQUIRE_CANONICAL_REBIND')
                if retained_all and len(set(native_ids))==1:
                    reasons.append('SELF_EDGE_FROM_PREMATURE_NATIVE_ID_WELD')
                    premature+=1
                candidates.append(dict(
                    physicalVertexId=vertex,branchOccurrenceIndex=bi,
                    sourceNodeOrdinals=ids,
                    retainedSourceNodeOrdinals=[f['sourceNodeOrdinal'] for f in finals],
                    finalNativeNodeNumbers=native_ids,
                    authoredPositiveSourceNodeNumbers=positive,
                    status=status,requiredContractions=len(run)-1,
                    nativeNodeNumberReuseAllowedNow=False,reasons=reasons))
            run=[]
            for row in ordered:
                if run and row['sourceNodeOrdinal'] != run[-1]['sourceNodeOrdinal']+1:
                    flush(run);run=[]
                run.append(row)
            flush(run)
    distinct_id_collisions=sum(len(v)>1 for v in final_ids.values())
    return dict(
        schema=SCHEMA,sourceXmlSha256=source_sha,
        originalNodeOccurrences=len(rows),
        retainedNodeOccurrences=len(fl),
        candidates=candidates,
        summary=dict(
            exactSourcePhysicalVertices=len(vertex_groups),
            zeroLengthRunsRequiringTopologyReview=len(candidates),
            retainedZeroLengthSourceEdges=retained_edges,
            alreadyPrunedZeroLengthSourceEdges=pruned_edges,
            disconnectedNativeIdCollisions=distinct_id_collisions,
            prematureNativeIdSelfEdges=premature,
            originalPositionsChanged=0,
            physicalMassOwnersReassigned=0,
            topologyContracted=False,
            nativeCiiReleaseAuthorized=False,
        )
    )


def root(parent,index):
    while parent[index]!=index:
        index=parent[index]
    return index


def verify_audit(original,final,retained,aliases,source_sha,claimed,fail):
    fail(isinstance(claimed,dict) and claimed.get('schema')==SCHEMA,
         'NATIVE_CONTRACTION_SCHEMA_INVALID')
    derived=expected_audit(original,final,retained,aliases,source_sha)
    fail(claimed==derived,'NATIVE_CONTRACTION_AUDIT_DRIFT')
    return derived
