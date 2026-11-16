import { createElement, appendLabeledControl } from './xml-cii-adapted-dom.js';
import {
  bindUnifiedSupportMappingTable,
  renderUnifiedSupportMappingTable
} from '../../model-converters/converters/xmltocii2019_helper/support-mapping-table.js';
import { saveMasterContextToLocalStorage, updateWorkflowState } from './xml-cii-adapted-state.js?v=20261001-weight-output-2';
import { migrateSupportMappingConfig } from '../../../converters/xml-cii2019-core/support-mapping-config.js';
import { recordPreviewRestraintReview,recordPreviewFailure } from './xml-cii-adapted-preview-failure-notice.js';
import { createDefaultSupportTypeMapperConfig } from '../xml-cii-support-type-mapper.js';

const KINDS = ['REST', 'GUIDE', 'LINESTOP', 'ANCHOR'];

function mapperRowsOf(state) {
  return state.supportTypeMapperConfig || createDefaultSupportTypeMapperConfig();
}

function rowFor(state, kind) {
  return mapperRowsOf(state).find((row) => row.kind === kind) || { kind, aliases: [], ciiKind: '' };
}

function table(headers, rows, keys, emptyText) {
  if (!rows.length) return createElement('div', emptyText, 'xml-cii-phase-help');
  const tableEl = createElement('table', '', 'xml-cii-audit-table');
  const thead = createElement('thead');
  const headRow = createElement('tr');
  for (const header of headers) headRow.appendChild(createElement('th', header));
  thead.appendChild(headRow);
  const tbody = createElement('tbody');
  for (const row of rows.slice(0, 300)) {
    const tr = createElement('tr');
    for (const key of keys) {
      const value = row[key];
      tr.appendChild(createElement('td', Array.isArray(value) ? value.join(', ') : String(value ?? '')));
    }
    tbody.appendChild(tr);
  }
  tableEl.append(thead, tbody);
  return tableEl;
}

function renderMapperKindSection(parent, state, kind) {
  const row = rowFor(state, kind);
  const section = createElement('section', '', 'xml-cii-audit-panel');
  section.appendChild(createElement('h3', `${kind} mapper section`));

  const aliasArea = appendLabeledControl(section, 'Aliases (one per line):', createElement('textarea'));
  aliasArea.value = (row.aliases || []).join('\n');
  aliasArea.dataset.field = `support-mapper-aliases-${kind}`;

  const ciiInput = appendLabeledControl(section, 'Audit display label:', createElement('input'));
  ciiInput.type = 'text';
  ciiInput.value = row.ciiKind || '';
  ciiInput.dataset.field = `support-mapper-cii-${kind}`;

  parent.appendChild(section);
}

function renderConfidencePolicy(parent) {
  const section = createElement('section', '', 'xml-cii-audit-panel');
  section.appendChild(createElement('h3', 'Confidence / precedence policy'));
  section.appendChild(createElement(
    'p',
    'By default a valid NODETYPE after the 8 Config mutation takes precedence. The optional source-field precedence below uses the saved Step 7 rules against original staged fields instead when they disagree. The preview names the matched rule, priority and source field. Generated labels are fallback evidence. Test evaluates the proposed configuration; Save to Config makes that configuration available to Preview, Final and Run. Equal-priority conflicting rules remain review-required.',
    'xml-cii-phase-help'
  ));
  parent.appendChild(section);
}

function renderTestInputSection(parent, state) {
  const section = createElement('section', '', 'xml-cii-audit-panel');
  section.appendChild(createElement('h3', 'Test Input / Save to Config'));
  const input = appendLabeledControl(section, 'Support / DTXR text to classify (one per line):', createElement('textarea'));
  input.value = state.supportTypeMapperTestInput || '';
  input.dataset.field = 'support-mapper-test-input';

  const help = createElement('p', 'Use | between separate support occurrences. The audit keeps NAME=... occurrence identity so one support cannot acquire another support segment\'s kind.', 'xml-cii-phase-help');
  section.appendChild(help);

  const actions = createElement('div', '', 'xml-cii-resolver-actions');
  const testBtn = createElement('button', state.supportTypeMapperRunning ? 'Testing…' : 'Test support mapper');
  testBtn.type = 'button';
  testBtn.dataset.action = 'build-support-mapper';
  const saveBtn = createElement('button', 'Save to Config');
  saveBtn.type = 'button';
  saveBtn.dataset.action = 'save-support-mapper';
  actions.append(testBtn, saveBtn, createElement('span', state.supportTypeMapperStatus || 'Support mapper not tested yet.', 'xml-cii-phase-help'));
  section.appendChild(actions);
  parent.appendChild(section);
}

function renderPreviewSection(parent, state) {
  const result = state.supportTypeMapperResult;
  const section = createElement('section', '', 'xml-cii-audit-panel');
  section.appendChild(createElement('h3', 'CII Support Kind / Confidence Audit'));
  section.appendChild(table(
    ['Occurrence', 'Source', 'Evidence', 'Support Kind', 'Audit Label', 'XML/CII Type(s)', 'Confidence', 'Score', 'Matched Alias', 'Match Mode', 'Suppressed Candidates', 'Status', 'Decision Basis'],
    result?.previewRows || [],
    ['occurrenceName', 'source', 'evidenceText', 'supportKind', 'ciiKind', 'runtimeXmlTypes', 'confidence', 'confidenceScore', 'matchedAlias', 'matchMode', 'suppressedCandidates', 'status', 'decisionReason'],
    'No preview rows yet. Enter text above and click Test support mapper.'
  ));
  parent.appendChild(section);
}

function renderDiagnosticsSection(parent, state) {
  const result = state.supportTypeMapperResult;
  const section = createElement('section', '', 'xml-cii-audit-panel');
  section.appendChild(createElement('h3', 'Mapper Diagnostics'));
  section.appendChild(table(
    ['Level', 'Type', 'Occurrence', 'Confidence', 'Message'],
    result?.diagnostics || [],
    ['level', 'type', 'occurrenceName', 'confidence', 'message'],
    'No diagnostics yet.'
  ));
  parent.appendChild(section);
}

function renderRawJsonSection(parent, state) {
  const details = createElement('details', '', 'xml-cii-raw-json');
  details.appendChild(createElement('summary', 'Raw JSON advanced/debug — auditable mapper result'));
  details.appendChild(createElement('pre', JSON.stringify(state.supportTypeMapperResult || {}, null, 2)));
  parent.appendChild(details);
}

// Free-text support/DTXR description → REST/GUIDE/LINESTOP/ANCHOR kind classifier. Distinct from
// the numeric restraint-type-code table below: this classifies loose text evidence into a kind,
// the unified table below maps a kind to CAESAR/CII restraint type codes.
function renderSupportTypeClassifierPanel(card, state) {
  renderConfidencePolicy(card);
  for (const kind of KINDS) renderMapperKindSection(card, state, kind);
  renderTestInputSection(card, state);
  renderPreviewSection(card, state);
  renderDiagnosticsSection(card, state);
  renderRawJsonSection(card, state);
}

function renderRestraintTypeCodeTable(card, stateRef, render) {
  const state = stateRef.current;
  const config = JSON.parse(state.supportConfigJson || '{}');

  const container = createElement('div', '', 'mc-support-mapper-host');
  card.appendChild(container);

  const onSaveConfig = (nextConfig) => {
    const nextJson = JSON.stringify(nextConfig, null, 2);
    const current = stateRef.current || {};
    const masterContext = current.masterContext
      ? { ...current.masterContext, config: nextConfig }
      : current.masterContext;
    stateRef.current = updateWorkflowState(current, {
      supportConfigJson: nextJson,
      masterContext,
    });
    if (stateRef.current.masterContext) saveMasterContextToLocalStorage(stateRef.current.masterContext);
    if (typeof render === 'function') render();
  };

  const policy=Object.assign({},config.xml229SourceFieldPrecedence||{});
  const policySection=createElement('section','','xml-cii-audit-panel');
  policySection.appendChild(createElement('h3',config.xml229RestraintPrecedence?'Mapped restraint authority — configured in 3 JSON Trace':'Staged JSON conflict precedence'));
  const choices=config.xml229RestraintPrecedence?[]:[
    ['type','In case of conflict, staged JSON field data (SKEY, DESCRIPTION, DESC, CMPSUPTYPE, DTXR, MDSSUPPTYPE) wins over NODETYPE.'],
    ['gap','In case of conflict, staged CMPSUPGAP / CMPSUPGAP_POS / CMPSUPGAP_PS or saved Step 7 Gap wins over NODEGAP.'],
    ['stiffness','In case of conflict, staged STIFFNESS / NODESTIFFNESS / CMPSUPSTIFF or Step 7 Stiffness wins over NODESTIFF.'],
    ['friction','In case of conflict, staged FRICTION / CMPSUPFRICTION or Step 7 Friction / Fixed Fric. wins over NODEFRICTION.']
  ];
  for(const [key,label] of choices){
    const input=appendLabeledControl(policySection,label,createElement('input'));
    input.type='checkbox';input.checked=policy[key]===true;
    input.dataset.field='xml229-source-field-precedence-'+key;
    input.disabled=config.xml229PhysicalVertexPrefinal===true;
    input.addEventListener('change',()=>{
      // Persist exactly the displayed profiles when Gap is explicitly selected.
      const next={...config,xml229SourceFieldPrecedence:{...policy,[key]:input.checked}};
      if(key==='gap'&&input.checked)next.supportMapping=migrateSupportMappingConfig(config);
      recordPreviewRestraintReview(null);recordPreviewFailure(null);
      onSaveConfig(next);
    });
  }
  const profiles=migrateSupportMappingConfig(config).kindProfiles;
  policySection.appendChild(createElement('p','Current Step 7 gap values (mm): REST '+profiles.REST.gap+
    ', GUIDE '+profiles.GUIDE.gap+', LINESTOP '+profiles.LINESTOP.gap+
    '. Verify the profile values before use; zero is an engineering clearance, not missing data.','xml-cii-phase-help'));
  if(!config.xml229RestraintPrecedence)policySection.appendChild(createElement('p','Off preserves the existing behavior. On is an explicit project-wide authority choice for matched staged members, not a change to the original JSON. Type uses enabled Step 7 rows by priority; generated labels cannot override NODETYPE. Gapless ST/GT type conflicts need the Gap option and a saved profile Gap. Equal-priority rules, incompatible source fields and invalid settings still require correction. Original XML-authored restraints remain protected. Rebuild Preview / O1 / Final after changes. This option is currently qualified only for the standard V1 closure.','xml-cii-phase-help'));
  card.appendChild(policySection);

  const conservation=appendLabeledControl(card,'Preserve separate restraints at connected source vertices (qualified inputs only):',createElement('input'));
  conservation.type='checkbox';conservation.checked=config.xml229PhysicalVertexPrefinal===true;
  conservation.dataset.field='physical-vertex-restraints';
  conservation.disabled=!!config.xml229RestraintPrecedence||Object.values(policy).some(v=>v===true);
  conservation.addEventListener('change',()=>onSaveConfig({...config,xml229PhysicalVertexPrefinal:conservation.checked}));
  card.appendChild(createElement('p','This opt-in requires exact source coordinate matches, one JSON member per restraint, and independent source replay. Auxiliary hardware roles, compound text and unsupported type profiles need review. Unbound or ambiguous evidence blocks conversion. Rebuild Preview/Final after changing it.','xml-cii-phase-help'));

  try {
    renderUnifiedSupportMappingTable(container, config);
    bindUnifiedSupportMappingTable(container, config, { onSaveConfig });
  } catch (error) {
    container.innerHTML = `
      <div style="padding:16px;text-align:center;color:#ef4444;">
        Support mapping table unavailable: ${error?.message || String(error)}
      </div>
    `;
  }
}

export function renderStandaloneSupportTypeMapperPanel(card, stateOrRef, render) {
  const isRef = stateOrRef && 'current' in stateOrRef;
  const stateRef = isRef ? stateOrRef : { current: stateOrRef };
  const state = stateRef.current;

  card.innerHTML = '';
  renderSupportTypeClassifierPanel(card, state);
  renderRestraintTypeCodeTable(card, stateRef, render);
}
