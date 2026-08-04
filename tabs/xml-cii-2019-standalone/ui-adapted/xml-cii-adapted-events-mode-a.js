import { bindAdaptedWorkflowEvents as bindSmartWorkflowEvents } from './xml-cii-adapted-events-smart.js?v=20260804-mode-a-v1';
import { downloadTextFile } from './xml-cii-adapted-dom.js?v=20260804-mode-a-v1';
import { activateModeASource, normalizeModeABatchState } from '../xml-cii-mode-a-batch.js?v=20260804-mode-a-v1';
import {
  clearModeASourceCaches,
  importModeASources,
  removeModeASource,
  replaceModeAState,
  updateModeASource,
} from './xml-cii-adapted-mode-a-state.js?v=20260804-mode-a-v1';
import { modeABatchArtifactValue } from './xml-cii-adapted-mode-a-panel.js?v=20260804-mode-a-v1';
import { runModeABatchFromUi } from './xml-cii-adapted-run-workflow-mode-a.js?v=20260804-mode-a-v1';
import { detectXmlCiiWorkflowSourceKind } from '../xml-cii-workflow-source-detect.js?v=20260804-mode-a-v1';

async function sourceRows(files, state) {
  const rows = [];
  const rejected = [];
  for (const file of files) {
    try {
      const sourceText = await file.text();
      const kind = detectXmlCiiWorkflowSourceKind(sourceText, 'xml');
      if (kind !== 'xml') {
        rejected.push(`${file.name} is ${kind}; Mode A multi-file import accepts PSI116 XML only.`);
        continue;
      }
      rows.push({
        sourceFile: file,
        fileName: file.name,
        sourceText,
        supportConfigJson: state.supportConfigJson,
      });
    } catch (error) {
      rejected.push(`${file.name}: ${error?.message || error}`);
    }
  }
  return { rows, rejected };
}

function installMultipleSourceCapture(container, stateRef, render) {
  container.querySelectorAll('[data-field="source-file"]').forEach((input) => {
    if (input.__xmlCiiModeABound) return;
    input.__xmlCiiModeABound = true;
    input.addEventListener('change', async (event) => {
      event.stopImmediatePropagation();
      const files = [...(event.target.files || [])];
      if (!files.length) return;
      const { rows, rejected } = await sourceRows(files, stateRef.current);
      const imported = importModeASources(stateRef.current, rows);
      const batch = imported.state.sourceBatch || {};
      clearModeASourceCaches();
      replaceModeAState(stateRef, {
        ...imported.state,
        sourceKind: 'xml',
        sourceBatch: {
          ...batch,
          importStatus: [batch.importStatus, ...rejected].filter(Boolean).join(' | '),
        },
      });
      render();
    }, true);
  });
}

function bindInventoryActions(container, stateRef, render) {
  container.querySelectorAll('[data-mode-a-action="activate"]').forEach((control) => {
    control.addEventListener('click', () => {
      clearModeASourceCaches();
      replaceModeAState(stateRef, activateModeASource(stateRef.current, control.dataset.modeASourceId));
      render();
    });
  });
  container.querySelectorAll('[data-mode-a-enable]').forEach((control) => {
    control.addEventListener('change', () => {
      replaceModeAState(stateRef, updateModeASource(stateRef.current, control.dataset.modeAEnable, { enabled: control.checked }));
      render();
    });
  });
  container.querySelectorAll('[data-mode-a-action="remove"]').forEach((control) => {
    control.addEventListener('click', () => {
      clearModeASourceCaches();
      replaceModeAState(stateRef, removeModeASource(stateRef.current, control.dataset.modeASourceId));
      render();
    });
  });
}

function replaceRunHandler(container, stateRef, render) {
  const existing = container.querySelector('[data-action="run"]');
  if (!existing?.parentNode) return;
  const replacement = existing.cloneNode(true);
  replacement.textContent = 'Run Separate Models';
  replacement.disabled = !!stateRef.current.batchRunning;
  existing.parentNode.replaceChild(replacement, existing);
  replacement.addEventListener('click', () => runModeABatchFromUi(stateRef, render));
}

function bindDownloads(container, stateRef) {
  container.querySelector('[data-mode-a-action="download-batch-manifest"]')?.addEventListener('click', () => {
    const manifest = stateRef.current.batchRunResult?.manifest;
    if (!manifest) return;
    downloadTextFile('xml-cii-mode-a-batch-manifest.json', JSON.stringify(manifest, null, 2), 'application/json;charset=utf-8');
  });
  container.querySelectorAll('[data-mode-a-action="download-batch-artifact"]').forEach((control) => {
    control.addEventListener('click', () => {
      const artifact = modeABatchArtifactValue(
        stateRef.current.batchRunResult,
        control.dataset.modeASourceId,
        control.dataset.modeAArtifact,
      );
      if (!artifact?.text) return;
      downloadTextFile(artifact.name, artifact.text, artifact.mime);
    });
  });
}

export function bindAdaptedWorkflowEvents(container, stateRef, render) {
  const rawRef = stateRef.modeABaseRef || stateRef;
  installMultipleSourceCapture(container, rawRef, render);
  const result = bindSmartWorkflowEvents(container, stateRef, render);
  bindInventoryActions(container, rawRef, render);
  replaceRunHandler(container, rawRef, render);
  bindDownloads(container, rawRef);
  return result;
}

export function modeASourceCount(state = {}) {
  return normalizeModeABatchState(state).sourceBatch?.sources?.length || 0;
}
