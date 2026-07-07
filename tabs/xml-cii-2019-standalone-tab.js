import { renderXmlCiiAdaptedWorkflowShell } from './xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell.js?v=20260707-shell-v3';

export const XML_CII_STANDALONE_UI_SMOKE_LABELS = Object.freeze([
  'Source type',
  'Element-based InputXML',
  'Element side-load text',
]);

export function ensureXmlCiiStandaloneStylesheet() {
  const existing = document.querySelector('link[data-xml-cii-standalone-style="true"]');
  const href = './tabs/xml-cii-2019-standalone-tab.css?v=20260707-layout-v3';
  if (existing) {
    if (existing.getAttribute('href') !== href) {
      existing.setAttribute('href', href);
    }
    return;
  }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.xmlCiiStandaloneStyle = 'true';
  document.head.appendChild(link);
}

export function renderXmlCii2019StandaloneTab(container) {
  ensureXmlCiiStandaloneStylesheet();
  return renderXmlCiiAdaptedWorkflowShell(container);
}
