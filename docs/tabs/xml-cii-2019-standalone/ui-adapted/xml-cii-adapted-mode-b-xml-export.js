import { combineXmlWithNodeOffsets } from '../../../converters/xml-cii2019-core/xml-node-offset-combine.js?v=20261001-weight-output-1';
import { createElement } from './xml-cii-adapted-dom.js';
import { modeAExecutionRows, modeARawState } from './xml-cii-adapted-mode-a-propagation.js?v=20261001-weight-output-1';

function download(value, filename, type) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function control(label, action) {
  const button = createElement('button', label, 'model-converters-run-btn');
  button.type = 'button'; button.dataset.modeBAction = action;
  return button;
}

export function renderModeBXmlExport(parent, stateRef, render) {
  const state = modeARawState(stateRef);
  const mode = state.xmlCombinationMode || 'mode-a';
  const panel = createElement('section', '', 'model-converters-workflow-master-card');
  panel.dataset.modeBXmlPanel = 'true';
  Object.assign(panel.style, { padding: '12px', margin: '12px 0', border: '1px solid #475569', borderRadius: '8px' });
  panel.appendChild(createElement('h3', 'Multiple XML mode'));
  const a = control('Mode A — Separate Models (Draft)', 'select-a');
  const b = control('Mode B — Combine XML (node offsets)', 'select-b');
  a.setAttribute('aria-pressed', String(mode === 'mode-a'));
  b.setAttribute('aria-pressed', String(mode === 'mode-b'));
  panel.append(a, b);
  for (const [button, selected] of [[a, 'mode-a'], [b, 'mode-b']]) button.addEventListener('click', () => {
    stateRef.current = { ...stateRef.current, xmlCombinationMode: selected }; render();
  });
  parent.appendChild(panel);
  if (mode !== 'mode-b') return;
  panel.appendChild(createElement('p', 'Combine selected branches from enabled files into one XML. Positive node IDs receive file offsets; repeated IDs within each file remain connected. Coordinates, engineering fields and negative helper IDs are preserved. Sources keep their own routes; this action adds no cross-file joins.'));
  renderCombineControls(panel, stateRef);
}

function renderCombineControls(panel, stateRef) {
  const basis = createElement('select'); basis.dataset.modeBBasis = 'true';
  for (const [value, label] of [['source', 'Source XML'], ['enriched', 'Latest enriched XML outputs']]) {
    const option = createElement('option', label); option.value = value; basis.appendChild(option);
  }
  const offset = createElement('input'); offset.type = 'number'; offset.min = '1'; offset.step = '1'; offset.value = '100000';
  Object.assign(offset.style, { background: '#101827', color: '#e2e8f0', border: '1px solid #475569', padding: '6px', borderRadius: '5px' });
  offset.setAttribute('aria-label', 'Node offset step'); offset.dataset.modeBOffset = 'true';
  const basisLabel = createElement('label', 'XML basis '); basisLabel.appendChild(basis);
  const offsetLabel = createElement('label', ' Node offset step '); offsetLabel.appendChild(offset);
  const build = control('Combine XML', 'combine');
  const save = control('Save Combined XML', 'save-xml'); save.disabled = true;
  const manifest = control('Save Node Offset Map', 'save-map'); manifest.disabled = true;
  const status = createElement('div', 'Choose the XML basis and combine to inspect source offsets.', 'model-converters-workflow-detail-note');
  status.dataset.modeBStatus = 'true';
  const table = createElement('pre'); table.dataset.modeBOffsets = 'true';
  panel.append(basisLabel, offsetLabel, build, save, manifest, status, table);
  let result = null;
  const clear = () => { result = null; save.disabled = true; manifest.disabled = true; table.textContent = ''; };
  basis.addEventListener('change', clear); offset.addEventListener('input', clear);
  bindCombineAction(build, stateRef, basis, offset, status, table, clear, (next) => {
    result = next; save.disabled = false; manifest.disabled = false;
  });
  save.addEventListener('click', () => { if (result) download(result.xmlText, 'Mode-B-combined.xml', 'application/xml'); });
  manifest.addEventListener('click', () => { if (result) download(JSON.stringify(result.manifest, null, 2), 'Mode-B-node-offset-map.json', 'application/json'); });
}

function bindCombineAction(build, stateRef, basis, offset, status, table, clear, release) {
  build.addEventListener('click', () => {
    clear();
    try {
      const sources = modeAExecutionRows(stateRef).map((entry) => {
        const xmlText = basis.value === 'enriched' ? entry.state.result?.enrichedText : entry.state.sourceText;
        if (!xmlText) throw new Error(`${entry.source.fileName}: no current enriched output; run this source first or choose Source XML.`);
        return { sourceId: entry.source.sourceId, fileName: entry.source.fileName, xmlText, basis: basis.value };
      });
      const result = combineXmlWithNodeOffsets(sources, { offsetStep: Number(offset.value) });
      status.textContent = `Combined ${result.manifest.sourceCount} XML files. Header from ${result.manifest.headerSource}. Ready to save.`;
      table.textContent = result.manifest.sourceOrder.map((row) => `${row.fileName}: offset +${row.offset} · ${row.positiveIdCount} positive IDs · ${row.basis}`).join('\n');
      release(result);
    } catch (error) { status.textContent = `Cannot combine XML: ${error.message}`; }
  });
}
