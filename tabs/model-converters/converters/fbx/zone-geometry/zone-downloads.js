function cleanFilePart(value, fallback) {
  const cleaned = String(value ?? '').trim().replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

function prefix(sourceName, zoneLabel) {
  return `${cleanFilePart(sourceName, 'fbx-source')}.${cleanFilePart(zoneLabel, 'selected-zone')}`;
}

export function buildFbxZoneGeometryDownloadName(sourceName, zoneLabel) {
  return `${prefix(sourceName, zoneLabel)}.FbxZoneGeometryEvidence.v1.json`;
}

export function buildFbxDerivedPortDownloadName(sourceName, zoneLabel) {
  return `${prefix(sourceName, zoneLabel)}.FbxDerivedPortEvidence.v1.json`;
}

export function buildFbxInternalPipeDownloadName(sourceName, zoneLabel) {
  return `${prefix(sourceName, zoneLabel)}.FbxInternalPipeMapping.v1.json`;
}

export function buildFbxBranchFittingDownloadName(sourceName, zoneLabel) {
  return `${prefix(sourceName, zoneLabel)}.FbxBranchFittingPortEvidence.v1.json`;
}

export function buildFbxAutoPipeOutputName(sourceName, zoneLabel) {
  return `${prefix(sourceName, zoneLabel)}.auto-pipe.staged.json`;
}

export function triggerJsonDownload(text, fileName, documentRef = document) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  const anchor = documentRef.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  documentRef.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
