import {
  installBranchFittingReviewUi,
  renderBranchFittingReviewUi,
  setBranchFittingDownloadAvailability,
} from '../fitting-kernels/branch-fitting/review-ui.js';
import {
  installInlineAssemblyReviewUi,
  renderInlineAssemblyReviewUi,
  setInlineAssemblyDownloadAvailability,
} from '../fitting-kernels/inline-assembly/review-ui.js';

export function installZoneReviewPanels(wrap) {
  return Object.freeze({
    branchFitting: installBranchFittingReviewUi(wrap),
    inlineAssembly: installInlineAssemblyReviewUi(wrap),
  });
}

export function renderZoneReviewPanels(panels, result) {
  renderBranchFittingReviewUi(
    panels?.branchFitting, result?.branchFittingReview || null);
  renderInlineAssemblyReviewUi(
    panels?.inlineAssembly, result?.inlineAssemblyReview || null);
}

export function updateZoneReviewDownloads(panels, state, complete) {
  setBranchFittingDownloadAvailability(
    panels?.branchFitting, complete && Boolean(state.branchFittingJson));
  setInlineAssemblyDownloadAvailability(
    panels?.inlineAssembly, complete && Boolean(state.inlineAssemblyJson));
}

export function bindZoneReviewDownloads(panels, onDownload) {
  panels.branchFitting.download.addEventListener('click', () => onDownload('branch-fitting'));
  panels.inlineAssembly.download.addEventListener('click', () => onDownload('inline-assembly'));
}
