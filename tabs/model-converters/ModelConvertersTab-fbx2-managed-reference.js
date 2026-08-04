import { renderModelConvertersTab as renderBaseModelConvertersTab } from './ModelConvertersTab.js?v=20260804-fbx-secondary-preview-1';
import { installFbxReviewUiAddon } from './fbx-review-ui-addon.js?v=20260804-fbx-secondary-preview-1';
import { installFbxLiveRunnerAddon } from './fbx-live-runner-addon.js?v=20260804-fbx-secondary-preview-1';
import { installFbxPreviewZoneSelector } from './fbx-preview-zone-selector.js?v=20260804-fbx-secondary-preview-1';
import { installFbxSelectedZonePreviewBridge } from './fbx-selected-zone-preview-bridge.js?v=20260804-fbx-secondary-preview-1';
import { installFbxZoneGeometryToolbar } from './converters/fbx/zone-geometry/zone-toolbar.js?v=20260804-fbx-secondary-preview-1';

export function renderModelConvertersTab(container, ctx) {
  installFbxReviewUiAddon();
  installFbxLiveRunnerAddon();
  installFbxPreviewZoneSelector(container);
  installFbxSelectedZonePreviewBridge();
  installFbxZoneGeometryToolbar(container);
  if (container?.dataset) container.dataset.fbxLiveUiVersion = '20260804-fbx-secondary-preview-1';
  return renderBaseModelConvertersTab(container, ctx);
}
