import { buildSelectedZonePackage } from './converters/fbx/zone-package/package-builder.js';
import { buildPackageArchive } from './converters/fbx/zone-package/archive.js';

const BUTTON_ATTR = 'data-fbx-zone-package-export';
const STATUS_ATTR = 'data-fbx-zone-package-export-status';
const INSTALL_MARKER = Symbol.for('model-converters.fbx-zone-package-export.v1');

function statusElementFor(container) {
  return container?.querySelector?.(`[${STATUS_ATTR}]`) || null;
}

function reportStatus(container, text) {
  const status = statusElementFor(container);
  if (status) status.textContent = text;
}

function triggerBoundedDownload(bytes, fileName) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Atomic publication: the archive is fully built in memory above before
  // anything is exposed to the user; the object URL exists only for the
  // instant needed to trigger the download, then is explicitly revoked.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function exportSelectedZonePackage(container, getPackageInputs) {
  const inputs = await getPackageInputs();
  if (!inputs) { reportStatus(container, 'No selected zone is available to export.'); return; }
  reportStatus(container, 'Building selected-zone package...');
  const { files, audit } = await buildSelectedZonePackage(inputs);
  const archive = await buildPackageArchive(files);
  triggerBoundedDownload(archive.bytes, `${inputs.fileNamePrefix || 'selected-zone'}.fbxzonepkg`);
  reportStatus(container, `Package exported: ${audit.geometryCount} geometries, ${files.length} files, digest ${archive.sha256.slice(0, 12)}...`);
}

function buttonHtml() {
  return `<button type="button" ${BUTTON_ATTR} class="model-converters-download-btn">Download zone package</button>`
    + `<span ${STATUS_ATTR} style="color:#9aa8ba;margin-left:8px;"></span>`;
}

function mountButton(container) {
  const host = container.querySelector('[data-fbx-preview-zone-wrap]') || container;
  const wrap = document.createElement('span');
  wrap.innerHTML = buttonHtml();
  host.appendChild(wrap);
  return wrap.querySelector(`[${BUTTON_ATTR}]`);
}

/**
 * Phase 6: wires a "Download zone package" button that builds the exact
 * Phase 1 package files, encodes them into a single bounded archive
 * (Phase 6 archive.js), and downloads it. `getPackageInputs` is the
 * integration seam a caller supplies to produce
 * `{ manifest, buffersByGeometryId, stagedJsonText?, supportEvidence?,
 * fileNamePrefix? }` for the currently selected zone; no parser, Writer,
 * Worker, or canvas is touched by this module.
 */
export function installFbxZonePackageExport(container, getPackageInputs) {
  if (typeof document === 'undefined' || !container || container[INSTALL_MARKER]) return;
  Object.defineProperty(container, INSTALL_MARKER, { value: true });
  const source = typeof getPackageInputs === 'function' ? getPackageInputs : async () => null;
  const button = mountButton(container);
  if (!button) return;
  button.addEventListener('click', () => {
    exportSelectedZonePackage(container, source).catch((error) => {
      reportStatus(container, `Zone package export failed: ${error?.message || error}`);
    });
  });
}
