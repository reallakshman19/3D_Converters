import { createElement } from './xml-cii-adapted-dom.js';
import {
  bindUnifiedSupportMappingTable,
  renderUnifiedSupportMappingTable
} from '../../model-converters/converters/xmltocii2019_helper/support-mapping-table.js';
import { saveMasterContextToLocalStorage } from './xml-cii-adapted-state.js';

export function renderStandaloneSupportTypeMapperPanel(card, stateOrRef, render) {
  const isRef = stateOrRef && 'current' in stateOrRef;
  const stateRef = isRef ? stateOrRef : { current: stateOrRef };
  const state = stateRef.current;
  const config = JSON.parse(state.supportConfigJson || '{}');

  const container = createElement('div', '', 'mc-support-mapper-host');
  card.innerHTML = '';
  card.appendChild(container);

  const onSaveConfig = (nextConfig) => {
    const nextJson = JSON.stringify(nextConfig, null, 2);
    stateRef.current.supportConfigJson = nextJson;
    if (stateRef.current.masterContext) {
      stateRef.current.masterContext.config = nextConfig;
      saveMasterContextToLocalStorage(stateRef.current.masterContext);
    }
    if (typeof render === 'function') render();
  };

  try {
    renderUnifiedSupportMappingTable(container, config);
    bindUnifiedSupportMappingTable(container, config, { onSaveConfig });
  } catch (error) {
    container.innerHTML = `
      <div style="padding:16px;text-align:center;color:#ef4444;">
        Support mapping table unavailable: ${error?.message || String(error)}
      </div>`;
  }
}
