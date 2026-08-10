import { createElement } from './xml-cii-adapted-dom.js';
import { downloadXmlCiiEvidenceZip } from '../xml-cii-evidence-zip.js';

export function appendXmlCiiEvidenceZipControl(card, stateRef) {
  const panel = createElement('section', '', 'xml-cii-weight-panel');
  panel.appendChild(createElement('h3', 'Qualification Evidence ZIP'));
  const row = createElement('div');
  row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;';
  const button = createElement('button', 'Save Enriched XML ZIP');
  button.type = 'button';
  button.dataset.action = 'save-enriched-xml-zip';
  const status = createElement('span', '', 'xml-cii-phase-help');
  const state = stateRef?.current || stateRef || {};
  const ready = !!(state.result?.enrichedEvidenceXml && state.result?.ciiText);
  button.disabled = !ready;
  button.style.cssText = 'cursor:pointer;padding:7px 14px;border-radius:6px;background:#1d4ed8;color:#fff;border:1px solid #2563eb;font-size:12px;';
  if (!ready) status.textContent = 'Run Finalise and Run first; the ZIP packages frozen run evidence only.';
  button.addEventListener('click', () => {
    try {
      const manifest = downloadXmlCiiEvidenceZip(stateRef?.current || stateRef || {});
      status.textContent = `Saved deterministic evidence ZIP (${manifest.artifacts.length + 1} files).`;
    } catch (error) {
      status.textContent = `ZIP blocked: ${error?.message || error}`;
    }
  });
  row.append(button, status);
  panel.appendChild(row);
  card.appendChild(panel);
}
