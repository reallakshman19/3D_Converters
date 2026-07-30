import {
  installBranchFittingReviewUi,
  renderBranchFittingReviewUi,
  setBranchFittingDownloadAvailability,
} from '../fitting-kernels/branch-fitting/review-ui.js';
import {
  installConnectivityReviewUi,
  renderConnectivityReviewUi,
  setConnectivityDownloadAvailability,
} from '../fitting-kernels/connectivity/review-ui.js';
import {
  installInlineAssemblyReviewUi,
  renderInlineAssemblyReviewUi,
  setInlineAssemblyDownloadAvailability,
} from '../fitting-kernels/inline-assembly/review-ui.js';
import {
  installGeneratedGapPipeReviewUi,
  renderGeneratedGapPipeReviewUi,
  setGeneratedGapPipeDownloadAvailability,
} from '../generated-gap-pipe/review-ui.js';

export function installZoneReviewPanels(wrap) {
  return Object.freeze({
    connectivity: installConnectivityReviewUi(wrap),
    generatedGapPipe: installGeneratedGapPipeReviewUi(wrap),
    branchFitting: installBranchFittingReviewUi(wrap),
    inlineAssembly: installInlineAssemblyReviewUi(wrap),
  });
}

export function renderZoneReviewPanels(panels, result) {
  renderConnectivityReviewUi(
    panels?.connectivity, result?.connectivityReview || null);
  renderGeneratedGapPipeReviewUi(
    panels?.generatedGapPipe, result?.generatedGapPipeReview || null);
  renderBranchFittingReviewUi(
    panels?.branchFitting, result?.branchFittingReview || null);
  renderInlineAssemblyReviewUi(
    panels?.inlineAssembly, result?.inlineAssemblyReview || null);
}

export function updateZoneReviewDownloads(panels, state, complete) {
  setConnectivityDownloadAvailability(
    panels?.connectivity, complete && Boolean(state.connectivityJson));
  setGeneratedGapPipeDownloadAvailability(
    panels?.generatedGapPipe, complete && Boolean(state.generatedGapPipeJson));
  setBranchFittingDownloadAvailability(
    panels?.branchFitting, complete && Boolean(state.branchFittingJson));
  setInlineAssemblyDownloadAvailability(
    panels?.inlineAssembly, complete && Boolean(state.inlineAssemblyJson));
}

export function bindZoneReviewDownloads(panels, onDownload) {
  panels.connectivity.download.addEventListener('click', () => onDownload('connectivity'));
  panels.generatedGapPipe.download.addEventListener('click', () => onDownload('generated-gap-pipe'));
  panels.branchFitting.download.addEventListener('click', () => onDownload('branch-fitting'));
  panels.inlineAssembly.download.addEventListener('click', () => onDownload('inline-assembly'));
}
