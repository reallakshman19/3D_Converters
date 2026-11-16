import assert from 'node:assert/strict';
import test from 'node:test';

import { runStandaloneRegexTester, resetRegexTesterCacheForTests } from '../tabs/xml-cii-2019-standalone/xml-cii-regex-tester.js';
import { _derivePipingClassFromBranchName } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-dryrun-core.js';
import { deriveLineKeyFromBranchName } from '../converters/xml-cii2019-core/regex-line-key.js';
import { xmlCiiDryRunPreview } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-dryrun-core.js';
import { resolveBranchProcessData } from '../converters/xml-cii2019-core/branch-process-resolver.js';
import { buildPipingClassIndex } from '../converters/xml-cii2019-core/piping-class-resolver.js';

const dominantBranch = '/ASIM-1885-3"-S8811000-91261M7-HC-01/B1';
const alternativeBranch = '/ASIM-1885-PL-HOT-S8822000-91261M7-HC-01/B2';

const extractionConfig = {
  activeFormatIndex: 0,
  ratingSequence: [],
  formats: [
    {
      tokenDelimiter: '-',
      lineKeyJoiner: '',
      lineKey: { regex: '^/ASIM-1885-[0-9]+(?:")?-(S[0-9]+)', group: 1, tokenPosition: '' },
      pipingClass: { regex: '^/ASIM-1885-[0-9]+(?:")?-S[0-9]+-([A-Z0-9]+)', group: 1, tokenPosition: '' },
      rating: { regex: '', group: 1, tokenPosition: '' },
      bore: { regex: '^/ASIM-1885-([0-9]+)(?:")?', group: 1, tokenPosition: '' },
    },
    {
      tokenDelimiter: '-',
      lineKeyJoiner: '',
      lineKey: { regex: '^/ASIM-1885-PL-HOT-(S[0-9]+)', group: 1, tokenPosition: '' },
      pipingClass: { regex: '^/ASIM-1885-PL-HOT-S[0-9]+-([A-Z0-9]+)', group: 1, tokenPosition: '' },
      rating: { regex: '', group: 1, tokenPosition: '' },
      bore: { regex: '', group: 1, tokenPosition: '' },
    },
  ],
};

const sourceText = [
  '<Plant>',
  '<Branch><Branchname>' + dominantBranch + '</Branchname></Branch>',
  '<Branch><Branchname>' + alternativeBranch + '</Branchname></Branch>',
  '</Plant>',
].join('');

function withDeclaredBranches(fn) {
  const previousParser = globalThis.DOMParser;
  globalThis.DOMParser = class {
    parseFromString(xml, mediaType) {
      assert.equal(xml, sourceText);
      assert.equal(mediaType, 'application/xml');
      const branches = [dominantBranch, alternativeBranch].map((name) => ({
        getAttribute: () => '',
        children: [{ localName: 'Branchname', textContent: name }],
      }));
      return {
        querySelector: () => null,
        getElementsByTagNameNS: (_namespace, tag) => tag === 'Branch' ? branches : [],
        getElementsByTagName: (tag) => tag === 'Branch' ? branches : [],
      };
    }
  };
  resetRegexTesterCacheForTests();
  try { return fn(); }
  finally {
    resetRegexTesterCacheForTests();
    if (previousParser === undefined) delete globalThis.DOMParser;
    else globalThis.DOMParser = previousParser;
  }
}

function inspectBothFormats() {
  return withDeclaredBranches(() => {
    const result = runStandaloneRegexTester({
      sourceText,
      sourceKind: 'xml',
      extractionConfig,
      supportConfigJson: '{}',
    });
    return { result, config: JSON.parse(result.supportConfigJson) };
  });
}

test('U1 Regex controls: Format 1 and 2 independently match expected engineering roles', () => {
  const { result, config } = inspectBothFormats();
  assert.equal(result.matchedRows.length, 2);
  assert.equal(config.regexTester.formats.length, 2);
  const dominant = result.matchedRows.find(row => row.branchName === dominantBranch);
  const alternative = result.matchedRows.find(row => row.branchName === alternativeBranch);
  assert.deepEqual(
    [dominant?.matchedFormatIndex, dominant?.lineKey, dominant?.pipingClass],
    [0, 'S8811000', '91261M7'],
  );
  assert.deepEqual(
    [alternative?.matchedFormatIndex, alternative?.lineKey, alternative?.pipingClass],
    [1, 'S8822000', '91261M7'],
  );
});

test('U1 RED: Preview derives the Format-2 piping class instead of the shifted Line Key', () => {
  const { config } = inspectBothFormats();
  assert.equal(
    _derivePipingClassFromBranchName(alternativeBranch, config),
    '91261M7',
    'Format 2 piping class must not silently fall back to the legacy shifted token',
  );
});

test('U1 RED: Preview derives the Format-2 line key instead of HOT', () => {
  const { config } = inspectBothFormats();
  assert.equal(
    deriveLineKeyFromBranchName(alternativeBranch, config),
    'S8822000',
    'Format 2 line key must not fall back to the legacy HOT token',
  );
});


function withMinimalPreviewDocument(callback) {
  const previousParser = globalThis.DOMParser;
  const branchElement = (name) => ({
    localName: 'Branch', nodeType: 1,
    childNodes: [{ localName: 'Branchname', nodeType: 1, textContent: name, childNodes: [] }],
  });
  globalThis.DOMParser = class {
    parseFromString(xml, type) {
      assert.equal(type, 'application/xml');
      assert.equal(xml, sourceText);
      const branches = [dominantBranch, alternativeBranch].map(branchElement);
      return {
        getElementsByTagName(tag) {
          if (tag === 'Branch') return branches;
          return [];
        },
      };
    }
  };
  try { return callback(); }
  finally {
    if (previousParser === undefined) delete globalThis.DOMParser;
    else globalThis.DOMParser = previousParser;
  }
}

function persistedFormatConfig() {
  return inspectBothFormats().config;
}

test('U3: actual Preview rows use Regex Format-2 authority for both engineering identity fields', () => {
  const config = persistedFormatConfig();
  const preview = withMinimalPreviewDocument(() => xmlCiiDryRunPreview(sourceText, config, ''));
  assert.equal(preview.branchRows.length, 2);
  const dominant = preview.branchRows.find(row => row.branchName === dominantBranch);
  const alternative = preview.branchRows.find(row => row.branchName === alternativeBranch);
  assert.deepEqual([dominant?.lineKey, dominant?.pipingClass, dominant?.matchedFormatIndex, dominant?.extractionStatus],
    ['S8811000', '91261M7', 0, 'MATCHED']);
  assert.deepEqual([alternative?.lineKey, alternative?.pipingClass, alternative?.matchedFormatIndex, alternative?.extractionStatus],
    ['S8822000', '91261M7', 1, 'MATCHED']);
});

test('U3: exact Line List class defaults selected; explicit Regex choice survives rebuild', () => {
  const config = persistedFormatConfig();
  config.linelist.masterRows = [{ lineKey: 'S8822000', pipingClass: '61440' }];
  const build=()=>withMinimalPreviewDocument(() => xmlCiiDryRunPreview(sourceText, config, '')).branchRows.find(row => row.branchName === alternativeBranch);
  const alternative = build();
  assert.equal(alternative.extractionStatus, 'MATCHED');
  assert.equal(alternative.pipingClassRegex,'91261M7');
  assert.equal(alternative.pipingClassLineList,'61440');
  assert.equal(alternative.pipingClassConflict,true);
  assert.equal(alternative.pipingClassSelectedSource,'line-list');
  assert.equal(alternative.pipingClass,'61440');
  config.overrides={...(config.overrides||{}),pipingClassSource:{[alternativeBranch]:{regex:'91261M7',lineList:'61440',source:'regex'}}};
  assert.equal(build().pipingClass,'91261M7');
  assert.equal(build().pipingClassSelectedSource,'regex');
});

test('U3: an explicitly mapped class column takes precedence over canonical row alias', () => {
  const config = persistedFormatConfig();
  config.linelist.fieldMap = { ...(config.linelist.fieldMap || {}), pipingClass: 'Approved Class Column' };
  config.linelist.masterRows = [{ lineKey: 'S8822000', pipingClass: '61440', 'Approved Class Column': '91261M7' }];
  const preview = withMinimalPreviewDocument(() => xmlCiiDryRunPreview(sourceText, config, ''));
  const alternative = preview.branchRows.find(row => row.branchName === alternativeBranch);
  assert.equal(alternative?.extractionStatus, 'MATCHED');
  assert.equal(alternative?.branchIdentityConflict, '');
  assert.equal(alternative?.pipingClass, '91261M7');
});

test('U3: ambiguous formats fail closed through Preview into process and material authority', () => {
  const config = persistedFormatConfig();
  config.regexTester.formats.push({
    tokenDelimiter: '-',
    lineKey: { regex: '(S8822000)', group: 1 },
    pipingClass: { regex: '(S8822000)', group: 1 },
  });
  const preview = withMinimalPreviewDocument(() => xmlCiiDryRunPreview(sourceText, config, ''));
  const alternative = preview.branchRows.find(row => row.branchName === alternativeBranch);
  assert.equal(alternative?.extractionStatus, 'AMBIGUOUS');
  assert.equal(alternative?.pipingClass, '');
  assert.equal(alternative?.rating, '');
  assert.equal(alternative?.materialCode, '');
  assert.equal(alternative?.wallThickness, '');
});

test('U3: process resolver accepts authoritative class rather than re-deriving from legacy tokens', () => {
  const result = resolveBranchProcessData({
    branchName: alternativeBranch,
    lineKey: 'S8822000',
    lineRow: { pipingClass: '61440' },
    boreMm: 80,
    componentType: 'PIPE',
    pipingClassIndex: buildPipingClassIndex([]),
    config: { rating: { pipingClassTokenIndex: 5 } },
    branchIdentity: { status: 'MATCHED', lineKey: 'S8822000', pipingClass: '91261M7', matchedFormatIndex: 1 },
  });
  assert.equal(result.requestedPipingClass, '91261M7');
  assert.equal(result.pipingClassSource, 'configured-branch-format');
});

test('U4: 4 Preview computes independent Format 1/2 review passes on identity conflict',()=>{
  const config=persistedFormatConfig();
  config.regexTester.formats[0]={
    tokenDelimiter:'-',
    lineKey:{regex:'(S8822000)',group:1},
    pipingClass:{regex:'(S8822000)',group:1},
  };
  const preview=withMinimalPreviewDocument(()=>xmlCiiDryRunPreview(sourceText,config,''));
  const actual=preview.branchRows.find(r=>r.branchName===alternativeBranch);
  assert.equal(actual.extractionStatus,'AMBIGUOUS');
  assert.equal(actual.materialCode,'','neither competing master is authoritative');
  assert.equal(preview.formatPreviewPasses.length,2);
  const pass1=preview.formatPreviewPasses[0].branchRows.find(r=>r.branchName===alternativeBranch);
  const pass2=preview.formatPreviewPasses[1].branchRows.find(r=>r.branchName===alternativeBranch);
  assert.deepEqual([pass1.extractionStatus,pass1.lineKey,pass1.pipingClass],
    ['MATCHED','S8822000','S8822000']);
  assert.deepEqual([pass2.extractionStatus,pass2.lineKey,pass2.pipingClass],
    ['MATCHED','S8822000','91261M7']);
  assert.equal(actual.pipingClass,'','conflicting passes cannot choose a class');
});

test('Step 4 insulation normalization, explicit zero, XML variation and no implicit density',async()=>{
 const {normalizePreviewInsulationThickness:n,resolvePreviewInsulation:r}=await import('../converters/xml-cii2019-core/preview-insulation.js');
 for(const [raw,want] of [['25–50 mm','50'],['50 to 75','75'],['25/50','50'],['25 mm','25'],['1/2 in','12.7'],['2 cm','20'],['NIL','0'],['0','0'],['N/A',''],['-3',''],['50 + 10',''],['H50','']])assert.equal(n(raw).value,want,raw);
 const row=r({xmlThicknesses:['70','80','0',''],lineThickness:'25–50 mm',lineType:'H'});
 assert.equal(row.insThk,'80');assert.equal(row.insThkXmlRange,'0–80');assert.equal(row.insThkFallback,'50');assert.equal(row.insType,'H');
 const manual=r({xmlThicknesses:['70','80'],override:{insThk:'25',insType:'C'},lineThickness:'50',lineType:'H'});
 assert.equal(manual.insThk,'25');assert.equal(manual.insThkXmlRange,'70–80');assert.equal(manual.insThkFallback,'25');assert.equal(manual.insType,'C');
 assert.equal(r({lineThickness:'TBD 50'}).insThkNeedsReview,true);
});
test('Step 4 source columns inline conflict radio pair and insulation columns last',async()=>{
 const {BRANCH_COLUMNS,XmlCiiAdaptedEditablePreviewTable}=await import('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-editable-preview-table.js');
 assert.deepEqual(BRANCH_COLUMNS.slice(-2).map(c=>c.id),['insThk','insType']);
 const i=BRANCH_COLUMNS.findIndex(c=>c.id==='pipingClass');assert.deepEqual(BRANCH_COLUMNS.slice(i-2,i+1).map(c=>c.id),['pipingClassRegex','pipingClassLineList','pipingClass']);
 const row={branchName:'/TEST/B1',lineKey:'P100',pipingClassRegex:'A',pipingClassLineList:'B',pipingClass:'B',pipingClassConflict:true,pipingClassSelectedSource:'line-list',insThk:'0',insType:'H',insThkSource:'linelist',insTypeSource:'linelist'};
 const t=new XmlCiiAdaptedEditablePreviewTable({branchRows:[row],nodesByBranch:new Map()});
 const html=t.renderHTML();assert.match(html,/name="mc-pc-source-0" data-mc-pc-source="regex"/);assert.match(html,/data-mc-pc-source="line-list" data-mc-pc-row="0" checked/);assert.match(html,/data-mc-pd-field="insThk"/);assert.match(html,/data-mc-pd-field="insType"/);
});

test('Step 4 config roundtrip retains branch source choice and mapped insulation columns',async()=>{
 const {parseXmlCiiEnrichmentConfig}=await import('../converters/xml-cii2019-core/config.js');
 const {normalizeLineListRow}=await import('../converters/xml-cii2019-core/linelist-mapping.js');
 const {resolvePreviewPipingClassAuthority:r}=await import('../converters/xml-cii2019-core/piping-class-source-resolver.js');
 const choice={source:'regex',regex:'91261M7',lineList:'61440'};
 const cfg=parseXmlCiiEnrichmentConfig(JSON.stringify({overrides:{pipingClassSource:{[alternativeBranch]:choice},processData:{S8822000:{insThk:'0',insType:'H'}}},linelist:{masterRows:[{'Insulation Thickness [mm]':'25-50','Insulation Type':'H'}]}}));
 assert.deepEqual(cfg.overrides.pipingClassSource[alternativeBranch],choice);
 assert.equal(cfg.overrides.processData.S8822000.insThk,'0');
 const a={branchName:alternativeBranch,branchClass:'91261M7',lineListClass:'61440',lineListExact:true,config:cfg};
 assert.equal(r(a).requestedPipingClass,'91261M7');
 assert.equal(r({...a,lineListClass:'61441'}).requestedPipingClass,'61441');
 const row=normalizeLineListRow(cfg.linelist.masterRows[0],cfg.linelist.fieldMap,0);
 assert.equal(row.insThk,'25-50');assert.equal(row.insType,'H');
 assert.equal(normalizeLineListRow({'Selected':'','Insulation Type':'H'},{insType:'Selected'},0).insType,'');
});
