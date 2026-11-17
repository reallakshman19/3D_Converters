// Step 10 checkbox "UXML route", on by default (Owner, 17 Nov 2026); unticking it is remembered in this browser only.
import { UXML_ROUTE_STORAGE_KEY, uxmlRouteOn } from '../xml-cii-uxml-route.js';

function saveSwitch(on, storage) {
  try {
    if (on) storage?.removeItem?.(UXML_ROUTE_STORAGE_KEY);
    else storage?.setItem?.(UXML_ROUTE_STORAGE_KEY, 'off');
  } catch {
    // Storage blocked: the switch cannot be remembered and the Run uses the default (the UXML route).
  }
}

/** Adds the switch after the Run buttons (once per render). */
export function appendUxmlRouteSwitch(actions, storage = globalThis.localStorage) {
  if (!actions || actions.querySelector?.('[data-uxml-route-switch]')) return null;
  const label = document.createElement('label');
  label.dataset.uxmlRouteSwitch = 'true';
  label.className = 'xml-cii-phase-help';
  label.title = 'On (default): the CII input XML comes from the UXML supports stage; today\'s route still runs first, its '
    + 'parity check must pass on the UXML XML, and the log says whether the two XMLs match. Off: today\'s route. Not used for Mode B.';
  // The workspace styles stack label contents in a column; this switch keeps the box beside its text.
  Object.assign(label.style, { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '6px',
    margin: '6px 0', fontSize: '12px', cursor: 'pointer' });
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.style.alignSelf = 'center';
  box.checked = uxmlRouteOn(storage);
  box.addEventListener('change', () => saveSwitch(box.checked, storage));
  label.append(box, document.createTextNode('UXML route'));
  actions.appendChild(label);
  return label;
}
