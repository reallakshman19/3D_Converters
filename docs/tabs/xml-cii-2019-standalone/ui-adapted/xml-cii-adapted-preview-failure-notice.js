/**
 * Last Preview failure, shared read-only with other steps (e.g. JSON Trace)
 * so a blocking source conflict found by Preview is visible where the source
 * is inspected. Display only: it never changes any source, trace or output.
 */
const EVENT = 'xml-cii-preview-failure';
let last = null;

export function recordPreviewFailure(failure) {
  last = failure ? {
    code: String(failure.code || ''),
    message: String(failure.message || ''),
    at: new Date().toISOString(),
  } : null;
  try { globalThis.dispatchEvent?.(new CustomEvent(EVENT, { detail: last })); } catch { /* no DOM */ }
}

export function lastPreviewFailure() { return last; }

/** Render (or clear) the Preview blocker line inside a panel; keeps it current. */
export function showPreviewBlocker(panel) {
  if (!panel) return;
  const paint = () => {
    let line = panel.querySelector('[data-preview-blocker]');
    const failure = last && /^PREFINAL_RESTRAINT_/.test(last.code) ? last : null;
    if (!failure) { line?.remove(); return; }
    if (!line) {
      line = document.createElement('p');
      line.dataset.previewBlocker = 'true';
      line.setAttribute('role', 'alert');
      line.style.cssText = 'color:#fecaca;background:#451a1a;border:1px solid #ef4444;padding:7px;border-radius:5px;';
      panel.append(line);
    }
    line.textContent = 'Preview blocked: ' + failure.code + ' — ' + failure.message +
      '. Source paths are verified here, but this support conflict must be fixed in the JSON/XML before Preview can run.';
  };
  paint();
  if (panel.dataset.previewBlockerListener !== 'true') {
    panel.dataset.previewBlockerListener = 'true';
    globalThis.addEventListener?.(EVENT, () => { if (panel.isConnected) paint(); });
  }
}
