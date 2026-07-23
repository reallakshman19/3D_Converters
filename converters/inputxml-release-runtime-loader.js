/**
 * Functionality: load the InputXML browser runtime solely from the local verified manifest.
 * Parameters: a Pyodide instance and the manifest URL.
 * Outputs: verified runtime files in /repo and installed pinned Python packages.
 * Fallback: none; missing, modified, CDN-hosted, or unlisted files block conversion.
 */
const EXPECTED_SCHEMA = 'InputXmlBrowserRuntimeManifest.v1';
const EXPECTED_PYODIDE_VERSION = '0.27.2';

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function fetchLocalBytes(url, baseUrl) {
  const resolved = new URL(url, baseUrl);
  if (resolved.origin !== new URL(baseUrl).origin) {
    throw new Error(`InputXML runtime asset is not same-origin: ${resolved.href}.`);
  }
  const response = await fetch(resolved, { cache: 'no-store' });
  if (!response.ok) {
    const detail = (await response.text()).trim();
    throw new Error(`InputXML runtime asset failed: ${resolved.pathname} HTTP ${response.status}${detail ? `: ${detail}` : ''}.`);
  }
  return { bytes: new Uint8Array(await response.arrayBuffer()), url: resolved.href };
}

async function validateManifest(manifest) {
  if (manifest?.schema !== EXPECTED_SCHEMA) throw new Error(`Unsupported InputXML runtime schema ${manifest?.schema || 'missing'}.`);
  if (manifest.pyodideVersion !== EXPECTED_PYODIDE_VERSION) throw new Error(`InputXML runtime requires Pyodide ${EXPECTED_PYODIDE_VERSION}.`);
  if (!Array.isArray(manifest.assets) || !manifest.assets.length) throw new Error('InputXML runtime manifest has no assets.');
  const copy = { ...manifest };
  const expected = copy.manifestHashSha256;
  delete copy.manifestHashSha256;
  const observed = await sha256Hex(new TextEncoder().encode(stableJson(copy)));
  if (observed !== expected) throw new Error('InputXML runtime manifest hash is invalid.');
}

function writeRuntimeFile(pyodide, target, bytes) {
  const parent = target.slice(0, target.lastIndexOf('/'));
  pyodide.FS.mkdirTree(parent);
  pyodide.FS.writeFile(target, bytes);
}

async function loadAsset(pyodide, asset, manifestUrl) {
  if (!asset?.url || !asset?.sha256 || !asset?.kind) throw new Error('InputXML runtime asset record is incomplete.');
  const loaded = await fetchLocalBytes(asset.url, manifestUrl);
  const observed = await sha256Hex(loaded.bytes);
  if (observed !== asset.sha256 || loaded.bytes.length !== asset.bytes) {
    throw new Error(`InputXML runtime asset verification failed for ${asset.url}.`);
  }
  if (asset.kind !== 'python-package') writeRuntimeFile(pyodide, asset.target, loaded.bytes);
  return { ...asset, resolvedUrl: loaded.url };
}

function installImportPaths(pyodide) {
  pyodide.runPython(`
import sys
for inputxml_path in ["/repo/converters/scripts", "/repo/scripts", "/repo"]:
    if inputxml_path not in sys.path:
        sys.path.insert(0, inputxml_path)
`);
}

export async function loadVerifiedInputXmlRuntime(pyodide, manifestUrl) {
  const manifestResponse = await fetch(manifestUrl, { cache: 'no-store' });
  if (!manifestResponse.ok) throw new Error(`InputXML runtime manifest failed: HTTP ${manifestResponse.status}.`);
  const manifest = await manifestResponse.json();
  await validateManifest(manifest);
  const loaded = [];
  for (const asset of manifest.assets) loaded.push(await loadAsset(pyodide, asset, manifestUrl));
  const packages = loaded.filter((asset) => asset.kind === 'python-package');
  await pyodide.loadPackage(packages.map((asset) => asset.resolvedUrl));
  installImportPaths(pyodide);
  return Object.freeze({ manifest, packageCount: packages.length, assetCount: loaded.length });
}
