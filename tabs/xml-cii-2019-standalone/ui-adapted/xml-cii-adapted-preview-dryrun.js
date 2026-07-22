export * from './xml-cii-adapted-preview-dryrun-core.js';

import { xmlCiiDryRunPreview as buildCorePreview } from './xml-cii-adapted-preview-dryrun-core.js';
import { applyPreviewBoreWallAuthority } from './xml-cii-adapted-preview-bore-wall-authority.js';

export function xmlCiiDryRunPreview(xmlText, config, stagedJsonText) {
  const result = buildCorePreview(xmlText, config, stagedJsonText);
  return applyPreviewBoreWallAuthority({
    xmlText,
    config,
    stagedJsonText,
    result,
  });
}
