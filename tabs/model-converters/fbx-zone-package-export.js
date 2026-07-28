import { buildSelectedZonePackage } from './converters/fbx/zone-package/package-builder.js';
import { buildPackageArchive } from './converters/fbx/zone-package/archive.js';

const BUTTON_ATTR = 'data-fbx-zone-package-export';
const STATUS_ATTR = 'data-fbx-zone-package-export-status';
const INSTALL_MARKER = Symbol.for('model-converters.fbx-zone-package-export.v2');
const PACKAGE_INPUT_EVENT = 'model-converters:fbx-zone-package-inputs';
function statusElementFor(container) { return container?.querySelector?.(`[${STATUS_ATTR}]`) || null; }
function reportStatus(container, text) { const status = statusElementFor(container); if (status) status.textContent = text; }
function triggerBoundedDownload(bytes, fileName) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = fileName;
  document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
}
async function exportSelectedZonePackage(container, inputs) {
  if (!inputs) { reportStatus(container, 'Analyse a selected FBX zone before exporting.'); return; }
  reportStatus(container, 'Building selected-zone package...');
  const { files, audit } = await buildSelectedZonePackage(inputs);
  const archive = await buildPackageArchive(files);
  triggerBoundedDownload(archive.bytes, `${inputs.fileNamePrefix || 'selected-zone'}.fbxzonepkg`);
  reportStatus(container, `Package exported: ${audit.geometryCount} geometries, ${files.length} files, digest ${archive.sha256.slice(0, 12)}...`);
}
function mountButton(container) {
  const existing = container.querySelector?.(`[${BUTTON_ATTR}]`); if (existing) return existing;
  const host = container.querySelector('[data-fbx-preview-zone-wrap]') || container;
  const wrap = document.createElement('span');
  wrap.innerHTML = `<button type="button" ${BUTTON_ATTR} class="model-converters-download-btn" disabled>Download zone package</button>`
    + `<span ${STATUS_ATTR} style="color:#9aa8ba;margin-left:8px;"></span>`;
  host.appendChild(wrap); return wrap.querySelector(`[${BUTTON_ATTR}]`);
}
export function installFbxZonePackageExport(container, getPackageInputs = null) {
  if (typeof document === 'undefined' || !container || container[INSTALL_MARKER]) return;
  Object.defineProperty(container, INSTALL_MARKER, { value: true });
  const button = mountButton(container); if (!button) return;
  let latestInputs = null;
  const provided = typeof getPackageInputs === 'function' ? getPackageInputs : null;
  const update = (inputs) => {
    latestInputs = inputs || null; button.disabled = !latestInputs;
    reportStatus(container, latestInputs
      ? 'Selected-zone package is ready to build.'
      : 'Analyse a selected FBX zone before exporting.');
  };
  window.addEventListener(PACKAGE_INPUT_EVENT, (event) => update(event.detail?.inputs || null));
  update(null);
  button.addEventListener('click', () => {
    Promise.resolve(provided ? provided() : null)
      .then((inputs) => exportSelectedZonePackage(container, inputs || latestInputs))
      .catch((error) => reportStatus(container, `Zone package export failed: ${error?.message || error}`));
  });
}
