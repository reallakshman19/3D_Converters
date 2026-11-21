// Step 10 "Download Run record" (Owner 17 Nov 2026): after a Run on the UXML route, one JSON file with what that Run
// changed (rule and source of every support and engineering value). Open it in the XML_Compare_Utilities review page,
// section 4. Hidden when the last Run kept no record (UXML route off, or no Run yet).
// E4b step 3 (Owner 21 Nov 2026): beside it, "Download CII sidecar" when the CII engine read the document ("Engine reads
// UXML" on): one <model>.cii.sidecar.json per CII (node ids, name history, what each recorded step changed).
import { ciiSidecars, uxmlRunRecordFileText, uxmlRunRecords } from '../xml-cii-uxml-run-record.js';
import { sidecarFileName } from '../xml-cii-uxml-sidecar.js';

function download(text, fileName) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Adds the button after the Run buttons (once per render); returns a function that shows or hides it. */
export function appendUxmlRunRecordButton(actions, records = uxmlRunRecords, sidecars = ciiSidecars) {
  if (!actions || actions.querySelector?.('[data-uxml-run-record]')) return () => {};
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.uxmlRunRecord = 'true';
  button.title = 'What the last Run changed on the UXML route: every support and engineering value with the rule and source '
    + 'that set it. Open the file in the XML_Compare_Utilities review page, section 4 "Open a Run record".';
  const refresh = () => {
    const list = records();
    button.hidden = !list.length;
    button.textContent = list.length > 1 ? `Download Run record (${list.length} models)` : 'Download Run record';
  };
  button.addEventListener('click', () => {
    const list = records();
    if (!list.length) return;
    const name = list.length === 1 ? list[0].model.replace(/\.[^.]+$/, '') : 'models';
    download(uxmlRunRecordFileText(list), `${name}_uxml-run-record.json`);
  });
  actions.appendChild(button);
  const side = document.createElement('button');
  side.type = 'button';
  side.dataset.ciiSidecar = 'true';
  side.title = 'Optional file beside each CII: for every CII node number, the UXML node id(s) it came from, their "|" name '
    + 'history and what each recorded step changed. Made only when "Engine reads UXML" is on. CAESAR II does not need it.';
  side.addEventListener('click', () => {
    for (const sidecar of sidecars()) download(JSON.stringify(sidecar, null, 1), sidecarFileName(sidecar.cii?.name));
  });
  actions.appendChild(side);
  const refreshBoth = () => {
    refresh();
    const list = sidecars();
    side.hidden = !list.length;
    side.textContent = list.length > 1 ? `Download CII sidecar (${list.length} models)` : 'Download CII sidecar';
  };
  refreshBoth();
  return refreshBoth;
}
