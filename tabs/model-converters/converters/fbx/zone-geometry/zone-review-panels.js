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
  installPrimaryFittingReviewUi,
  renderPrimaryFittingReviewUi,
  setPrimaryFittingDownloadAvailability,
} from '../fitting-kernels/primary-fitting/review-ui.js';
import {
  installGeneratedGapPipeReviewUi,
  renderGeneratedGapPipeReviewUi,
  setGeneratedGapPipeDownloadAvailability,
} from '../generated-gap-pipe/review-ui.js';

export function installZoneReviewPanels(wrap) {
  return Object.freeze({
    connectivity: installConnectivityReviewUi(wrap),
    generatedGapPipe: installGeneratedGapPipeReviewUi(wrap),
    primaryFitting: installPrimaryFittingReviewUi(wrap),
    branchFitting: installBranchFittingReviewUi(wrap),
    inlineAssembly: installInlineAssemblyReviewUi(wrap),
  });
}

export function renderZoneReviewPanels(panels, result) {
  renderConnectivityReviewUi(
    panels?.connectivity, result?.connectivityReview || null);
  renderGeneratedGapPipeReviewUi(
    panels?.generatedGapPipe, result?.generatedGapPipeReview || null);
  renderPrimaryFittingReviewUi(
    panels?.primaryFitting, result?.primaryFittingReview || null);
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
  setPrimaryFittingDownloadAvailability(panels?.primaryFitting, {
    elbow: complete && Boolean(state.elbowJson),
    tee: complete && Boolean(state.teeJson),
    reducer: complete && Boolean(state.reducerJson),
  });
  setBranchFittingDownloadAvailability(
    panels?.branchFitting, complete && Boolean(state.branchFittingJson));
  setInlineAssemblyDownloadAvailability(
    panels?.inlineAssembly, complete && Boolean(state.inlineAssemblyJson));
}

export function bindZoneReviewDownloads(panels, onDownload) {
  panels.connectivity.download.addEventListener('click', () => onDownload('connectivity'));
  panels.generatedGapPipe.download.addEventListener('click', () => onDownload('generated-gap-pipe'));
  panels.primaryFitting.downloads.elbow.addEventListener('click', () => onDownload('elbow'));
  panels.primaryFitting.downloads.tee.addEventListener('click', () => onDownload('tee'));
  panels.primaryFitting.downloads.reducer.addEventListener('click', () => onDownload('reducer'));
  panels.branchFitting.download.addEventListener('click', () => onDownload('branch-fitting'));
  panels.inlineAssembly.download.addEventListener('click', () => onDownload('inline-assembly'));
}
