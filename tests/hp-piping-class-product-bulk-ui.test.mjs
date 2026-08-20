import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const wrapper = await readFile(new URL('../tabs/hp-piping-class-product-bulk-workbench-tab.js', import.meta.url), 'utf8');
const route = await readFile(new URL('../tabs/engineering-workspace-tab.js', import.meta.url), 'utf8');

test('active HP route uses the product-bulk wrapper over the existing KD/result workbench', () => {
  assert.match(route, /hp-piping-class-product-bulk-workbench-tab\.js/);
  assert.match(wrapper, /hp-piping-class-kd-bulk-workbench-tab\.js/);
});

test('design-basis UI exposes strict product matrix preview/apply controls', () => {
  for (const token of [
    'data-hpwb-product-bulk',
    'Validate matrix',
    'Apply + batch calculate',
    'product_id',
    'nominal_size',
    'internal_allowance_mm',
    'external_allowance_mm',
  ]) assert.match(wrapper, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('bulk apply reuses the existing governed JSON import and calculate actions', () => {
  assert.match(wrapper, /serializeHpPipingClassWorkspaceProject/);
  assert.match(wrapper, /new DataTransfer\(\)/);
  assert.match(wrapper, /data-hpwb-file/);
  assert.equal(wrapper.includes('[data-hpwb-action="calculate"]'), true);
});

test('nominal size is persisted through the existing relational input binding', () => {
  assert.match(wrapper, /products\.\$\{index\}\.nominalSize/);
  assert.match(wrapper, /data-hpwb-bind/);
  assert.match(wrapper, /Nominal size/);
});

test('UI states governed products and design pressure are not inferred or overwritten', () => {
  assert.match(wrapper, /Governed\/master products remain read-only and are preserved/);
  assert.match(wrapper, /Design pressure remains the class-level field above and is not inferred/);
});
