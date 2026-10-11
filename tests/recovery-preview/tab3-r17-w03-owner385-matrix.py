#!/usr/bin/env python3
"""R17 W03: non-mutating exact-file Owner-385 decision matrix.

Reuses the earlier authenticated NEXT-08A workbook reader rather than replacing
the parser. Numeric coincidence, header guesses and implicit filtering never
grant approval. Owner must specify source, worksheet, logical-key/duplicate
rule, measurement units and original Owner-zone provenance.
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import runpy
import sys

ROOT = Path(__file__).resolve().parents[2]
prior = runpy.run_path(str(ROOT / 'tests/recovery-preview/next08a-b1-linelist-key-candidate-probe.py'))
SOURCE = prior['BOOKS']
UNITS = re.compile(r'\b(unit|length|diameter|size|nominal|bore|inch|mm|pressure|weight|elevation)\b', re.I)
OWNER = re.compile(r'\b(owner|site|zone|area|plant|project|location|system)\b', re.I)
KEY = re.compile(r'\b(line|reference|ref|name|key|id|specification|piping)\b', re.I)
TARGET = 385

def classify_headers(first):
    def found(pattern):
        return [{'column':k, 'literal':v[:120]} for k,v in first.items()
                if pattern.search(str(v))]
    return {'keyLike':found(KEY), 'unitLike':found(UNITS),
            'ownerSiteZoneLike':found(OWNER)}

def all_column_statistics(rows):
    if not rows: return []
    cols = sorted(set().union(*(r['cells'].keys() for r in rows)),
                  key=lambda v:(len(v),v))
    result = []
    for col in cols:
        values = [r['cells'].get(col,'') for r in rows[1:]]
        nonempty = [v for v in values if v]
        counter = Counter(nonempty)
        result.append({'column':col, 'firstRowHeaderCandidate':rows[0]['cells'].get(col,'')[:120],
          'nonemptyBelowFirst':len(nonempty), 'distinctExact':len(counter),
          'duplicateOccurrences':sum(n-1 for n in counter.values()), 
          'maxFrequency':max(counter.values(),default=0),
          'exact385NumericalCoincidenceOnly':len(counter)==TARGET,
          'approvedKey':False})
    return result

def audit_book(name,expected):
    path = ROOT/expected['path']
    raw=path.read_bytes()
    assert hashlib.sha256(raw).hexdigest()==expected['sha256'], 'SOURCE_DIGEST_DRIFT:'+name
    sheets = prior['workbook_grids'](path)
    a0 = prior['A0']['xlsx_sheets'](path)
    assert len(sheets)==len(a0),'A0_SHEET_COUNT_DRIFT:'+name
    findings=[]
    for sheet,control in zip(sheets,a0):
        rows=sheet['rows']
        assert len(rows)==control['populatedRowCount'],'A0_ROW_DRIFT:'+name
        columns=all_column_statistics(rows)
        first=rows[0]['cells'] if rows else {}
        findings.append({'sheet':sheet['sheetName'],
          'worksheetPart':sheet['worksheetPart'],
          'firstPopulatedExcelRow':rows[0]['excelRow'] if rows else None,
          'lastPopulatedExcelRow':rows[-1]['excelRow'] if rows else None,
          'physicalPopulatedRows':len(rows),
          'rowsAfterUnapprovedFirstHeader':max(len(rows)-1,0),
          'headerCandidates':classify_headers(first),
          'candidateColumns':columns,
          'exact385AcrossAllSingleColumns':[c['column'] for c in columns if c['exact385NumericalCoincidenceOnly']],
          'ownerApprovedMapping':None,
          'worksheetUnits':None,
          'logicalLineRule':None,
          'duplicateDisambiguationRule':None,
          'ownerZoneMembershipRule':None})
    assert sum(x['physicalPopulatedRows'] for x in findings)==expected['physicalRows']
    return {'candidate':name,'path':expected['path'],
      'sha256':expected['sha256'],'bytes':len(raw),'worksheets':findings}

def full_audit():
    books=[audit_book(n,s) for n,s in SOURCE.items()]
    other={}
    for kind,s in prior['OTHER'].items():
        blob=(ROOT/s['path']).read_bytes()
        assert hashlib.sha256(blob).hexdigest()==s['sha256'],'OTHER_SHA_DRIFT:'+kind
        if kind=='materialMap':
            data=[line for line in blob.decode('utf-8-sig').splitlines() if line.strip()]
            assert data[0].strip()=='2019'
            size=len(data)-1
        else:
            size=len(json.loads(blob))
        assert size==s['count'],'OTHER_COUNT_DRIFT:'+kind
        other[kind]={'sha256':s['sha256'],'originalRows':size,'source':s['path']}
    return {'schema':'TAB3.R17.W03.Original385Attestation.v1',
      'task':'TAB3-R17-W03',
      'decision':'NOT_ATTESTED',
      'targetLogicalRowsOwnerStatement':TARGET,
      'acceptedLogicalRowCount':None,
      'noSynthetic385Generation':True,
      'independentOriginalCensusCrossCheck':'A0 plus NEXT08A ZIP worksheet parser',
      'candidates':books,'otherMasterSources':other,
      'authorityMatrix':{
        'originalWorkbookSHA':'CANDIDATES_ONLY_OWNER_MUST_SELECT',
        'originalWorksheet':'CANDIDATES_ONLY_OWNER_MUST_SELECT',
        'actualHeaderRow':'NOT_APPROVED',
        'logicalLineMembership385':'NOT_APPROVED',
        'lineKeyFields':'NOT_APPROVED',
        'duplicatePolicy':'NOT_APPROVED',
        'engineeringUnits':'NOT_APPROVED',
        'siteZoneApplicability':'NOT_APPROVED',
        'B1ExclusiveWriter':'UNASSIGNED_AS_OF_CHECK',
      },
      'requiredOwnerDecision':{
        'decisionId':'D-212-9',
        'acceptOrRejectCandidateSHA':None,
        'worksheetName':None,
        'headerRowIndex':None,
        'physicalToLogical385MembershipRule':None,
        'exactCompositeLineKey':None,
        'duplicatesAndUnmappedPolicy':None,
        'fieldUnitsVersion':None,
        'originalSelectedOwnerSiteZoneRule':None,
        'authenticatedA3GenerationReceipt':None,
        'exclusiveB1WriterAndPermittedPaths':None,
      },
      'negativeAcceptance':[
        '802 physical or 801 after unapproved header is not 385 logical',
        '206 physical or 205 after unapproved header is not 385 logical',
        '385-count accidental distinct column cannot self-authorize',
        'unreviewed key dedup/truncation cannot self-authorize',
        'no physical selected Preview or Weight/Material/Run approval',
      ]}

def selftest():
    mock=[{'excelRow':1,'cells':{'A':'Name','B':'Owner/zone','C':'Bore (mm)'}},
          {'excelRow':2,'cells':{'A':'X','B':'Y','C':'10'}},
          {'excelRow':3,'cells':{'A':'X','B':'Y','C':'10'}}]
    fields=classify_headers(mock[0]['cells'])
    assert fields['ownerSiteZoneLike'][0]['column']=='B'
    assert fields['unitLike'][0]['column']=='C'
    stats=all_column_statistics(mock)
    assert stats[0]['distinctExact']==1 and stats[0]['duplicateOccurrences']==1
    assert not any(s['exact385NumericalCoincidenceOnly'] for s in stats)
    print('W03_NEGATIVE_RULE_SELFTEST_PASS')

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--self-test',action='store_true')
    p.add_argument('--out',type=Path)
    a=p.parse_args()
    if a.self_test:selftest();return
    report=full_audit()
    assert report['decision']=='NOT_ATTESTED'
    if a.out:
        a.out.parent.mkdir(parents=True,exist_ok=True)
        a.out.write_text(json.dumps(report,indent=2,sort_keys=True,ensure_ascii=False)+'\n',encoding='utf8')
    compact=[{'candidate':x['candidate'],'sha256':x['sha256'],
      'sheets':[{'sheet':s['sheet'],'physical':s['physicalPopulatedRows'],
         'belowFirst':s['rowsAfterUnapprovedFirstHeader'],
         'keyLike':s['headerCandidates']['keyLike'],
         'unitLike':s['headerCandidates']['unitLike'],
         'ownerLike':s['headerCandidates']['ownerSiteZoneLike'],
         'exact385SingleColumn':s['exact385AcrossAllSingleColumns']} for s in x['worksheets']]}
        for x in report['candidates']]
    print('TAB3_W03_OWNER_385_MATRIX '+json.dumps({
      'decision':report['decision'],'candidateSummary':compact,
      'otherOriginalMasterCounts':{k:v['originalRows'] for k,v in report['otherMasterSources'].items()},
      'ownerDecision':report['requiredOwnerDecision']},sort_keys=True))
    print('TAB3_W03_DONE_SOURCE_ONLY')

if __name__=='__main__':
    try:main()
    except (AssertionError,ValueError,OSError,KeyError) as exc:
        print('TAB3_W03_FAILED_CLOSED '+str(exc),file=sys.stderr)
        raise
