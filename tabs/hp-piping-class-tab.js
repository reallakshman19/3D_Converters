function ensureStylesheet() {
  if (document.querySelector('style[data-hp-piping-class-tab-style="true"]')) return;
  const style = document.createElement('style');
  style.dataset.hpPipingClassTabStyle = 'true';
  style.textContent = `
    .hp-piping-class-tab{display:grid;grid-template-rows:auto minmax(720px,1fr);gap:10px;min-height:calc(100vh - 150px);padding:0 18px 18px}
    .hp-piping-class-tab-header{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;padding:8px 0}
    .hp-piping-class-tab-header h2{margin:0;font-size:20px}.hp-piping-class-tab-header p{margin:4px 0 0;color:var(--text-muted,#9aa8b8)}
    .hp-piping-class-frame{width:100%;height:100%;min-height:900px;border:1px solid rgba(148,163,184,.18);border-radius:12px;background:#fff}
  `;
  document.head.appendChild(style);
}

export function renderHpPipingClassTab(container) {
  ensureStylesheet();
  container.innerHTML = `
    <div class="hp-piping-class-tab">
      <div class="hp-piping-class-tab-header">
        <div>
          <h2>HP Piping Class Standardization</h2>
          <p>B31.3 Chapter IX class-envelope workflow with controlled KD evidence and docs-backed engineering libraries.</p>
        </div>
      </div>
      <iframe
        class="hp-piping-class-frame"
        src="./engineering/hp-class-standardization/engineering-library.html"
        title="HP Piping Class Standardization">
      </iframe>
    </div>`;
  return () => { container.innerHTML = ''; };
}
