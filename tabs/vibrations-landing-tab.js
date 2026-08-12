function ensureStylesheet() {
  if (document.querySelector('link[data-vibrations-landing-style="true"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './tabs/vibrations-landing.css?v=vibrations-landing-1';
  link.dataset.vibrationsLandingStyle = 'true';
  document.head.appendChild(link);
}

function initialPage(context) {
  const value = String(context?.vibrationPage || context?.mechanismId || '').trim().toLowerCase();
  return value === 'fit' || value === 'vib.fiv.flow_turbulence' ? 'fit' : 'landing';
}

function landingHtml() {
  return `<div class="vibrations-landing">
    <header class="vibrations-landing-header">
      <div>
        <h2>Vibrations</h2>
        <p>Mechanism-specific vibration integrity workflows using table data from 3D EDIT and explicit operating/evidence inputs.</p>
      </div>
      <div class="vibrations-landing-boundary">
        <strong>TABLE-FIRST ENGINEERING</strong>
        <span>No 3D viewer or canvas in this product.</span>
      </div>
    </header>
    <section class="vibrations-mechanism-grid" aria-label="Vibration mechanisms">
      <article class="vibrations-mechanism-card">
        <div>
          <h3>Flow-Induced Turbulence (FIT)</h3>
          <p>Facility and line-level FIT readiness, benchmark calculation, evidence review and register export.</p>
        </div>
        <div class="vibrations-mechanism-meta">
          <span class="vibrations-pill">VIB.FIV.FLOW_TURBULENCE</span>
          <span class="vibrations-pill warn">BENCHMARK ONLY</span>
        </div>
        <ul class="vibrations-mechanism-list">
          <li>3D EDIT table export ingestion</li>
          <li>Readiness before calculation</li>
          <li>Facility FIT register and evidence detail</li>
          <li>No screening or design authority</li>
        </ul>
        <button type="button" class="vibrations-btn" data-vibrations-action="open-fit">Open FIT</button>
      </article>
    </section>
  </div>`;
}

function fitShellHtml() {
  return `<div class="vibrations-fit-shell">
    <div class="vibrations-fit-toolbar">
      <button type="button" class="vibrations-back" data-vibrations-action="back">← Vibrations</button>
      <span class="vibrations-crumb">Engineering Calculations / Vibrations / FIT</span>
    </div>
    <div class="vibrations-fit-panel" data-vibrations-fit-panel>
      <div class="vibrations-loading">Loading FIT workspace...</div>
    </div>
  </div>`;
}

export function renderVibrationsLandingTab(container, { context = null } = {}) {
  ensureStylesheet();
  let page = initialPage(context);
  let childDestroy = null;
  let renderToken = 0;
  let disposed = false;

  function cleanupChild() {
    try { childDestroy?.(); } catch (error) { console.warn('FIT workspace cleanup failed', error); }
    childDestroy = null;
  }

  function renderLanding() {
    renderToken += 1;
    cleanupChild();
    page = 'landing';
    container.innerHTML = landingHtml();
  }

  async function renderFit() {
    const token = ++renderToken;
    cleanupChild();
    page = 'fit';
    container.innerHTML = fitShellHtml();
    const panel = container.querySelector('[data-vibrations-fit-panel]');
    try {
      const module = await import('./vibration-integrity-tab.js?v=vibration-integrity-fit-2');
      if (disposed || token !== renderToken || page !== 'fit') return;
      panel.innerHTML = '';
      const maybeDestroy = module.renderVibrationIntegrityTab(panel);
      childDestroy = typeof maybeDestroy === 'function' ? maybeDestroy : null;
    } catch (error) {
      if (disposed || token !== renderToken) return;
      panel.innerHTML = `<div class="vibrations-error"><h3>Could not load FIT workspace</h3><pre>${String(error?.message || error)}</pre></div>`;
    }
  }

  function onClick(event) {
    const action = event.target.closest('[data-vibrations-action]')?.dataset.vibrationsAction;
    if (action === 'open-fit') renderFit();
    if (action === 'back') renderLanding();
  }

  container.addEventListener('click', onClick);
  if (page === 'fit') renderFit(); else renderLanding();

  return () => {
    disposed = true;
    renderToken += 1;
    cleanupChild();
    container.removeEventListener('click', onClick);
    container.innerHTML = '';
  };
}
