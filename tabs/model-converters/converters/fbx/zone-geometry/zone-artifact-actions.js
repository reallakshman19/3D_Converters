import {
  buildFbxBranchFittingDownloadName,
  buildFbxConnectivityDownloadName,
  buildFbxDerivedPortDownloadName,
  buildFbxGeneratedGapPipeDownloadName,
  buildFbxInlineAssemblyDownloadName,
  buildFbxInternalPipeDownloadName,
  buildFbxZoneGeometryDownloadName,
  triggerJsonDownload,
} from './zone-downloads.js';

const TEXT_FIELDS = Object.freeze({
  zone: 'zoneGeometryJson',
  port: 'derivedPortJson',
  pipe: 'internalPipeJson',
  connectivity: 'connectivityJson',
  'generated-gap-pipe': 'generatedGapPipeJson',
  'branch-fitting': 'branchFittingJson',
  'inline-assembly': 'inlineAssemblyJson',
});

const NAME_BUILDERS = Object.freeze({
  zone: buildFbxZoneGeometryDownloadName,
  port: buildFbxDerivedPortDownloadName,
  pipe: buildFbxInternalPipeDownloadName,
  connectivity: buildFbxConnectivityDownloadName,
  'generated-gap-pipe': buildFbxGeneratedGapPipeDownloadName,
  'branch-fitting': buildFbxBranchFittingDownloadName,
  'inline-assembly': buildFbxInlineAssemblyDownloadName,
});

function artifactText(state, kind) {
  const field = TEXT_FIELDS[kind];
  if (!field) throw new TypeError(`Unsupported FBX zone artifact kind: ${kind}`);
  return state?.[field] || null;
}

function artifactName(sourceName, zoneLabel, kind) {
  const builder = NAME_BUILDERS[kind];
  if (!builder) throw new TypeError(`Unsupported FBX zone artifact kind: ${kind}`);
  return builder(sourceName, zoneLabel);
}

export function downloadZoneArtifact({
  state,
  kind,
  sourceName,
  zoneLabel,
  documentRef,
} = {}) {
  const text = artifactText(state, kind);
  if (!text) return false;
  triggerJsonDownload(text, artifactName(sourceName, zoneLabel, kind), documentRef);
  return true;
}
