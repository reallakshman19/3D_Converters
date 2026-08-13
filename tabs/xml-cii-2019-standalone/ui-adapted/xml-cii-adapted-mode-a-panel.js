import * as core from './xml-cii-adapted-mode-a-panel-core.js';
import { buildModeAPreflight, normalizeModeABatchState } from '../xml-cii-mode-a-batch.js?v=20260813-mode-a-no-duplicate-validation-1';

export * from './xml-cii-adapted-mode-a-panel-core.js';

function selectedBranchCount(source) {
  return source?.branchSelection?.selectedBranchOccurrenceIds?.length
    ?? source?.branchSelection?.selectedBranchNames?.length
    ?? 0;
}

function renderBatchBranchOverview(parent, state) {
  const sources = (state.sourceBatch?.sources || []).filter((source) => source.enabled !== false);
  if (sources.length <= 1) return;
  const totalBranches = sources.reduce((sum, source) => sum + Number(source.metrics?.branchCount || 0), 0);
  const totalSelected = sources.reduce((sum, source) => sum + selectedBranchCount(source), 0);
  const section = document.createElement('section');
  section.className = 'model-converters-workflow-master-card xml-cii-mode-a-batch-branch-overview';
  Object.assign(section.style, { marginTop: '12px', padding: '12px', border: '1px solid #334155', borderRadius: '8px' });
  const title = document.createElement('div');
  title.className = 'model-converters-workflow-section-title';
  title.textContent = `Batch Branch Overview — ${sources.length} files · ${totalBranches} branch occurrences`;
  section.appendChild(title);
  const note = document.createElement('div');
  note.className = 'model-converters-workflow-detail-note';
  note.textContent = `${totalSelected}/${totalBranches} branch occurrences selected across the batch. Each XML remains an independent Mode A model.`;
  section.appendChild(note);
  for (const source of sources) {
    const details = document.createElement('details');
    details.style.marginTop = '6px';
    const summary = document.createElement('summary');
    summary.style.cursor = 'pointer';
    summary.textContent = `${source.fileName} — ${selectedBranchCount(source)}/${Number(source.metrics?.branchCount || 0)} selected`;
    details.appendChild(summary);
    const list = document.createElement('div');
    Object.assign(list.style, { marginLeft: '18px', padding: '4px 0 4px 10px', borderLeft: '1px solid #334155' });
    for (const occurrence of source.metrics?.branchOccurrences || []) {
      const row = document.createElement('div');
      row.className = 'xml-cii-phase-help';
      row.textContent = `🌿 ${occurrence.displayBranchName || occurrence.branchName || 'Unnamed branch'}`;
      list.appendChild(row);
    }
    details.appendChild(list);
    section.appendChild(details);
  }
  const branchPanel = parent.querySelector?.('.xml-cii-branch-scope-panel');
  if (branchPanel) parent.insertBefore(section, branchPanel);
  else parent.appendChild(section);
}

function relabelActiveSourcePanels(parent, state) {
  const sources = state.sourceBatch?.sources || [];
  if (sources.length <= 1) return;
  const active = sources.find((source) => source.sourceId === state.sourceBatch?.activeSourceId) || sources[0];
  if (!active) return;
  for (const heading of parent.querySelectorAll?.('h3') || []) {
    if (String(heading.textContent || '').startsWith('Hierarchy Preview')) {
      heading.textContent = `Active XML Hierarchy Preview — ${active.fileName} (Branches: ${Number(active.metrics?.branchCount || 0)})`;
      break;
    }
  }
  const branchPanel = parent.querySelector?.('.xml-cii-branch-scope-panel');
  if (!branchPanel) return;
  const strong = branchPanel.querySelector?.('strong');
  if (strong && String(strong.textContent || '').trim() === 'Branches to Process') strong.textContent = `Branches to Process — Active XML: ${active.fileName}`;
  const help = branchPanel.querySelector?.('.xml-cii-phase-help');
  if (help && String(help.textContent || '').includes('detected')) {
    const enabled = sources.filter((source) => source.enabled !== false);
    const totalBranches = enabled.reduce((sum, source) => sum + Number(source.metrics?.branchCount || 0), 0);
    help.textContent = `${Number(active.metrics?.branchCount || 0)} detected in active XML · ${selectedBranchCount(active)} selected · ${totalBranches} branches across ${enabled.length} enabled files`;
  }
}

function cleanInventoryPanel(panel, state) {
  if (!panel) return;
  const table = panel.querySelector?.('table');
  if (table) {
    const headers = [...(table.querySelectorAll?.('thead th') || [])];
    const index = headers.findIndex((th) => String(th.textContent || '').trim() === 'Conflicts');
    if (index >= 0) {
      headers[index].style.display = 'none';
      for (const row of table.querySelectorAll?.('tbody tr') || []) if (row.children?.[index]) row.children[index].style.display = 'none';
    }
  }
  const preflight = buildModeAPreflight(state.sourceBatch || {});
  for (const note of panel.querySelectorAll?.('.model-converters-workflow-detail-note') || []) {
    if (!String(note.textContent || '').includes('files enabled')) continue;
    note.textContent = `${preflight.enabledSourceCount}/${preflight.sourceCount} files enabled · ${preflight.branchCount} branch occurrences · ${preflight.nodeCount} XML nodes · duplicate validation disabled in Mode A.`;
    break;
  }
}

export function renderModeASourceInventory(parent, stateRef) {
  core.renderModeASourceInventory(parent, stateRef);
  const state = normalizeModeABatchState(stateRef.current);
  const panels = parent.querySelectorAll?.('[data-mode-a-panel="source-inventory"]') || [];
  cleanInventoryPanel(panels[panels.length - 1] || null, state);
  relabelActiveSourcePanels(parent, state);
  renderBatchBranchOverview(parent, state);
}
