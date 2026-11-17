// Step 10 "Download Run record" (Owner 17 Nov 2026): after a Run on the UXML route, one JSON file with what that Run
// changed (rule and source of every support and engineering value). Open it in the XML_Compare_Utilities review page,
// section 4. Hidden when the last Run kept no record (UXML route off, or no Run yet).
import { uxmlRunRecordFileText, uxmlRunRecords } from '../xml-cii-uxml-run-record.js';

function download(text, fileName) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Adds the button after the Run buttons (once per render); returns a function that shows or hides it. */
export function appendUxmlRunRecordButton(actions, records = uxmlRunRecords) {
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
  refresh();
  return refresh;
}
