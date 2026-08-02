import { renderModelConvertersTab as renderBaseModelConvertersTab } from './ModelConvertersTab.js?v=20260802-rvm-full-scope-tree-1';
import { installFbxReviewUiAddon } from './fbx-review-ui-addon.js?v=20260802-fbx2-managed-reference-1';

export function renderModelConvertersTab(container, ctx) {
  installFbxReviewUiAddon();
  return renderBaseModelConvertersTab(container, ctx);
}
