import { renderXmlCiiAdaptedWorkflowShell } from './xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell.js';

export function ensureXmlCiiStandaloneStylesheet() {
  if (document.querySelector('link[data-xml-cii-standalone-style="true"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './tabs/xml-cii-2019-standalone-tab.css';
  link.dataset.xmlCiiStandaloneStyle = 'true';
  document.head.appendChild(link);
}

export function renderXmlCii2019StandaloneTab(container) {
  ensureXmlCiiStandaloneStylesheet();
  return renderXmlCiiAdaptedWorkflowShell(container);
}
