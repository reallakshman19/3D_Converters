/**
 * Registers the CAESAR Ver. 14 <-> 11 neutral-file converter with all registry
 * module instances used by the current Model Converters shell.
 */
import { CONVERTERS as LEGACY_CONVERTERS } from './converter-registry.js?v=20260617-basic-glb-3';
import { CONVERTERS as SELECTOR_CONVERTERS } from './converter-registry.js?v=20260617-basic-glb-2';
import { CONVERTERS as LIVE_CONVERTERS } from './converter-registry.js?v=20260729-inputxml-live-release-1';
import { run as runCiiV11V14 } from './converters/cii-v11-v14.js?v=20260816-cii-v11-v14-1';

const CONVERTER_ID = 'cii_v11_v14';
const VERSION = '20260816-cii-v11-v14-1';

function definition() {
  return {
    id: CONVERTER_ID,
    label: 'CAESAR Ver. 14 ↔ 11',
    group: 'CAESAR II',
    disabled: false,
    allowSecondaryOnly: false,
    inputs: [
      { role: 'primary', label: 'CII v11 / v14 Input', accept: '.cii,.CII', required: true },
    ],
    options: [
      { key: 'targetVersion', label: 'Target Version', type: 'select', options: ['Auto (opposite)', '11', '14'] },
      { key: 'allowLossy', label: 'Allow lossy v14 → v11 downgrade', type: 'checkbox' },
    ],
    defaults: {
      targetVersion: 'Auto (opposite)',
      allowLossy: false,
    },
    description: 'Convert CAESAR II neutral files between v14 and v11 fixed-format dialects. Auto converts to the opposite detected version.',
    workflow: null,
    run: runCiiV11V14,
    integrationVersion: VERSION,
  };
}

function installInto(registry) {
  if (!Array.isArray(registry)) return false;
  const existing = registry.find((entry) => entry?.id === CONVERTER_ID);
  if (existing) {
    Object.assign(existing, definition());
    return true;
  }
  const item = definition();
  const anchor = registry.findIndex((entry) => entry?.id === 'cii_syntax_check_2019');
  if (anchor >= 0) registry.splice(anchor, 0, item);
  else registry.push(item);
  return true;
}

export function installCiiV11V14Addon() {
  const registries = new Set([LEGACY_CONVERTERS, SELECTOR_CONVERTERS, LIVE_CONVERTERS]);
  let installed = false;
  for (const registry of registries) installed = installInto(registry) || installed;
  return installed;
}

export const __CII_V11_V14_ADDON_VERSION__ = VERSION;
