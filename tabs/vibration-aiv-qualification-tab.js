import { renderAivQualificationWorkspaceHtml } from './vibration-aiv-qualification-view.js';

function ensureStylesheet() {
  if (document.querySelector('link[data-aiv-qualification-style="true"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './tabs/vibration-aiv-qualification.css?v=aiv-qualification-1';
  link.dataset.aivQualificationStyle = 'true';
  document.head.appendChild(link);
}

export function renderAivQualificationWorkspace(container) {
  ensureStylesheet();
  container.innerHTML = renderAivQualificationWorkspaceHtml();
  return () => {};
}
