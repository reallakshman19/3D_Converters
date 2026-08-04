import { renderActivePhase as renderBaseActivePhase } from './xml-cii-adapted-phase-panels.js?v=20260804-support-family-strict-line-v2';
import { enhanceRegexSmartWorkbench } from './xml-cii-adapted-regex-smart-ui.js';

const STRICT_NOTICE_ATTR = 'data-strict-line-authority-notice';

function applyStrictLineAuthorityUi(card) {
  const button = card?.querySelector?.('.bulk-autosuggest-btn');
  button?.remove?.();
  const wrapper = card?.querySelector?.('.bulk-branch-mapping-wrapper');
  if (!wrapper || wrapper.querySelector(`[${STRICT_NOTICE_ATTR}]`)) return;
  wrapper.insertAdjacentHTML(
    'afterbegin',
    `<div ${STRICT_NOTICE_ATTR}="true" class="model-converters-workflow-detail-note" style="margin:0 0 8px;border-color:#2563eb;color:#1e3a8a;background:#eff6ff;">Automatic similar line-number matching is disabled. Preview accepts only an explicit branch mapping or an exact loaded Line List key. Unresolved branches remain unmapped for Bulk Override.</div>`,
  );
}

function installStrictLineAuthorityUi(card) {
  if (!card) return;
  applyStrictLineAuthorityUi(card);
  if (typeof MutationObserver === 'undefined') return;
  card.__xmlCiiStrictLineObserver?.disconnect?.();
  const observer = new MutationObserver(() => applyStrictLineAuthorityUi(card));
  observer.observe(card, { childList: true, subtree: true });
  card.__xmlCiiStrictLineObserver = observer;
}

export function renderActivePhase(root, stateRef, render) {
  renderBaseActivePhase(root, stateRef, render);
  const phaseId = stateRef?.current?.activePhaseId;
  const card = root.querySelector(`[data-active-phase="${phaseId}"]`) || root;
  if (phaseId === 'regex') enhanceRegexSmartWorkbench(card, stateRef.current, stateRef, render);
  if (phaseId === 'preview') installStrictLineAuthorityUi(card);
}
