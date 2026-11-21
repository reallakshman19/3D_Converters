// UXML stage downloads on steps 1, 3, 4 and 6 (end-to-end plan E2c step 4; Owner 19 Nov 2026 "add Icon to download
// enrichedUXML at each stage", 20 Nov "Yes, build it"). Each button builds the job exactly as step 10's Run does (PR 438
// review B2): the seam first loads the full master rows and the original staged JSON (as before steps 6-10), then the
// Run's own per-source job builder (modeARunJobFromUi) reads the same state view the Run reads. The stage file is made
// by the same code (v045 xml-cii-uxml-stage-files.js). Opened in XML Compare's UXML review page, section 1.
import { createElement } from './xml-cii-adapted-dom.js?v=20260813-mode-a-consolidated-1';
import { ensureV045Inputs, v045ViewRef } from './xml-cii-v055-seam.js?v=20261113-x5a-2';
import { modeARawRef } from '../../../v045/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-mode-a-propagation.js?v=20260813-mode-a-rigid-review-1';
import { modeARunJobFromUi } from '../../../v045/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow-mode-a-fast.js?v=20261113-x5a-2';
import { buildUxmlStageFile, STAGES_OF_PHASE } from '../../../v045/tabs/xml-cii-2019-standalone/xml-cii-uxml-stage-files.js';

const LABELS = Object.freeze({
  S0: 'UXML: source read (S0)',
  S1: 'UXML: after gasket drop (S1)',
  S2: 'UXML: after staged JSON (S2)',
  S3: 'UXML: after 4 Preview (S3)',
  S4: 'UXML: after Weight Match (S4)',
});
const HINTS = Object.freeze({
  S2: 'What step 10 would make now, without your Preview edits and weight choices.',
  S3: 'What step 10 would make now, without your weight choices.',
  S4: 'What step 10 would make now: the document its UXML route sends the CII engine when the route is on and its parity check passes.',
});

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The job step 10's Run would build now (PR 438 review B2): same inputs, same state view, same per-source builder. */
export async function stageRunJob(stateRef, effectiveRef) {
  await ensureV045Inputs(stateRef);
  return modeARunJobFromUi(modeARawRef(v045ViewRef(effectiveRef, stateRef.current)));
}

/** Add the stage buttons above the active step's card (steps 1, 3, 4, 6), once a source is loaded.
 *  stateRef: the shell's state; effectiveRef: its branch-scoped view (as the shell gives step 10). */
export function installUxmlStageDownloads(main, stateRef, effectiveRef) {
  const card = main?.querySelector?.('[data-active-phase]');
  const stages = STAGES_OF_PHASE[card?.dataset?.activePhase];
  const state = stateRef?.current;
  if (!stages || !(state?.sourceText || state?.sourceFile || state?.branchScope?.filteredSourceText)) return null;
  const bar = createElement('div', '', 'xml-cii-uxml-stage-downloads');
  bar.dataset.uxmlStageDownloads = stages.join(',');
  const status = createElement('span', 'Download the model as UXML at this stage (a snapshot: the same code as step 10).', 'xml-cii-phase-help');
  for (const stage of stages) {
    const button = createElement('button', `⬇ ${LABELS[stage]}`, 'xml-cii-sub-phase-pill');
    button.type = 'button';
    button.dataset.uxmlStage = stage;
    if (HINTS[stage]) button.title = HINTS[stage];
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      button.disabled = true;
      status.textContent = `Making ${stage}: the same code as step 10 runs (up to half a minute on a large model)...`;
      try {
        const job = await stageRunJob(stateRef, effectiveRef);
        const { name, file } = await buildUxmlStageFile(job, stage);
        if (file.refusal) status.textContent = `${name}: no UXML document (${file.refusal}); the file says why.`;
        else status.textContent = `${name} downloaded (${file.deltas.length} recorded change step(s)). Open it in XML Compare, UXML review, section 1.`
          + (file.producer?.routeOn === false ? " Step 10's UXML route is off in this browser: the Run sends today's route XML, not this document." : '');
        download(name, JSON.stringify(file));
      } catch (error) {
        status.textContent = `No ${stage} file: ${error?.message || error}`;
      } finally {
        button.disabled = false;
      }
    });
    bar.append(button);
  }
  bar.append(status);
  // Above the step's card, not inside it: some steps (4 Preview) rebuild their card after it is drawn.
  card.before(bar);
  return bar;
}
