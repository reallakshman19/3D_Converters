function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function scheduleAutoBuild(details) {
  if (!details?.open || details.dataset.modeAPreviewAutoBuildScheduled === 'true') return;
  details.dataset.modeAPreviewAutoBuildScheduled = 'true';
  setTimeout(() => {
    delete details.dataset.modeAPreviewAutoBuildScheduled;
    if (!details.open) return;
    const build = details.querySelector('[data-mc-preview-build]');
    if (!build || build.dataset.modeAPreviewAutoBuilt === 'true') return;
    if (!/^Build Preview$/i.test(text(build.textContent))) return;
    build.dataset.modeAPreviewAutoBuilt = 'true';
    build.click();
  }, 0);
}

export function installModeAIndividualPreviewToolVisibility(workspace) {
  if (!workspace) return false;
  let installed = false;
  for (const details of workspace.querySelectorAll('details[data-mode-a-source-phase]')) {
    const summary = details.querySelector('summary');
    if (!/Preview\s*\/\s*Review/i.test(text(summary?.textContent))) continue;
    if (details.dataset.modeAPreviewToolsBound !== 'true') {
      details.dataset.modeAPreviewToolsBound = 'true';
      details.addEventListener('toggle', () => scheduleAutoBuild(details));
      installed = true;
    }
    if (details.open) scheduleAutoBuild(details);
  }
  return installed;
}
