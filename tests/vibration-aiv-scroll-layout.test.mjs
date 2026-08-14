import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('AIV workspace owns vertical scrolling inside the clipped application shell', () => {
  const shellCss = read('../styles/tabs.css');
  const qualificationCss = read('../tabs/vibration-aiv-qualification.css');
  const scrollCss = read('../tabs/vibration-aiv-scroll.css');
  const browserJs = read('../tabs/vibration-aiv-workspace-browser.js');

  assert.match(shellCss, /#tab-content\s*\{[\s\S]*?overflow:\s*hidden;/u);
  assert.match(shellCss, /#tab-content\s*>\s*\[data-tab-panel\]\s*\{[\s\S]*?overflow:\s*hidden;/u);
  assert.match(qualificationCss, /vibration-aiv-scroll\.css\?v=1/u);
  assert.match(browserJs, /vibration-aiv-qualification\.css\?v=aiv-qualification-13/u);

  assert.match(scrollCss, /\.aivq-root\s*\{/u);
  assert.match(scrollCss, /flex:\s*1 1 auto;/u);
  assert.match(scrollCss, /min-height:\s*0;/u);
  assert.match(scrollCss, /overflow-y:\s*auto;/u);
  assert.match(scrollCss, /overflow-x:\s*hidden;/u);
  assert.match(scrollCss, /scrollbar-gutter:\s*stable;/u);
});
