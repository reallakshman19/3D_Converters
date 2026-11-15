import {createElement} from './xml-cii-adapted-dom.js';
import {renderRestraintAuditPanel} from './xml-cii-restraint-audit-panel.js';
import {currentActiveRestraintAudit,inspectActiveRestraintAudit} from '../xml-cii-active-restraint-audit.js';
import {buildXmlCiiWorkflowJobFromUiState} from '../../../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-ui-adapter.js?v=20261113-x4-1';
import {normalizeWorkflowJob} from '../../../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-types.js?v=20261113-x4-1';
import {modeAExecutionRows} from '../../../v045/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-mode-a-propagation.js';

const isCurrent=(ref,report)=>currentActiveRestraintAudit(ref,report,buildXmlCiiWorkflowJobFromUiState,normalizeWorkflowJob);
const inspectCurrency=(ref,report)=>inspectActiveRestraintAudit(ref,report,buildXmlCiiWorkflowJobFromUiState,normalizeWorkflowJob);

export function renderActiveRestraintAuditPanels(parent,stateRef) {
  const wrapper=createElement('section');wrapper.dataset.activeRestraintAudits='true';
  const rows=modeAExecutionRows(stateRef);
  if(!rows.length)renderRestraintAuditPanel(wrapper,{stateRef,isCurrentAudit:isCurrent,inspectCurrency});
  for(const {source} of rows) {
    const section=createElement('section');section.dataset.auditSourceId=source.sourceId;
    section.appendChild(createElement('h3',source.fileName||source.alias||'XML model'));
    const ref={get current(){return modeAExecutionRows(stateRef).find(row=>row.source.sourceId===source.sourceId)?.state||{result:null};}};
    renderRestraintAuditPanel(section,{stateRef:ref,isCurrentAudit:isCurrent,inspectCurrency});
    wrapper.appendChild(section);
  }
  parent.appendChild(wrapper);
  const jump=createElement('button','View restraint audit','xml-cii-standalone-button');
  jump.type='button';
  jump.addEventListener('click',()=>wrapper.scrollIntoView({block:'start',behavior:'smooth'}));
  parent.prepend(jump);
}
