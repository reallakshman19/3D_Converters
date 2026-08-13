export function activateAivCanvasDetailTab(button) {
  const detail = button?.closest?.('[data-aiv-canvas-assumption-detail]');
  const tab = button?.dataset?.aivDetailTab;
  if (!detail || !tab) return false;
  for (const item of detail.querySelectorAll('[data-aiv-detail-tab]')) {
    item.setAttribute('aria-selected', item.dataset.aivDetailTab === tab ? 'true' : 'false');
  }
  for (const panel of detail.querySelectorAll('[data-aiv-detail-panel]')) {
    panel.hidden = panel.dataset.aivDetailPanel !== tab;
  }
  return true;
}
