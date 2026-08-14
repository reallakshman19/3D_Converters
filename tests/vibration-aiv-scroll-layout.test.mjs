import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('bounded engineering workspace owns vertical scrolling for nested AIV product surface', () => {
  const indexHtml = read('../index.html');
  const shellCss = read('../styles/tabs.css');
  const engineeringScrollCss = read('../styles/engineering-workspace-scroll.css');
  const engineeringWorkspaceJs = read('../tabs/engineering-workspace-tab.js');
  const consoleViewJs = read('../tabs/engineering-calculation-console-view.js');
  const aivScrollCss = read('../tabs/vibration-aiv-scroll.css');

  // The app shell deliberately clips its content viewport.
  assert.match(shellCss, /\.app-content\s*\{[\s\S]*?overflow:\s*hidden;/u);

  // Engineering workspace is rendered directly into .app-content and contains the nested AIV host path.
  assert.match(engineeringWorkspaceJs, /container\.innerHTML\s*=\s*`[\s\S]*?<div class="engineering-workspace">/u);
  assert.match(consoleViewJs, /data-aiv-qualification-host/u);

  // Therefore the first bounded child owns scrolling; this stylesheet is loaded directly by index.html.
  assert.match(indexHtml, /styles\/engineering-workspace-scroll\.css\?v=1/u);
  assert.match(engineeringScrollCss, /\.app-content\s*>\s*\.engineering-workspace\s*\{/u);
  assert.match(engineeringScrollCss, /flex:\s*1 1 auto;/u);
  assert.match(engineeringScrollCss, /min-height:\s*0;/u);
  assert.match(engineeringScrollCss, /overflow-y:\s*auto;/u);
  assert.match(engineeringScrollCss, /overflow-x:\s*hidden;/u);
  assert.match(engineeringScrollCss, /scrollbar-gutter:\s*stable;/u);

  // AIV root must not pretend to own viewport scrolling while its ancestors are auto-height.
  assert.match(aivScrollCss, /\.aivq-root\s*\{/u);
  assert.doesNotMatch(aivScrollCss, /overflow-y:\s*auto;/u);
});
