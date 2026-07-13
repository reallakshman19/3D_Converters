import fs from 'node:fs';

const path = 'scripts/xml-builder-inputxml-workpack-patch.mjs';
let source = fs.readFileSync(path, 'utf8');
function replaceOnce(before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Missing repair anchor: ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Non-unique repair anchor: ${label}`);
  source = source.slice(0, index) + after + source.slice(index + before.length);
}
replaceOnce(
  "    </div>\n  </section>`;`,\n`      <div",
  "    </div>`,\n`      <div",
  'diagnostics before template terminator',
);
replaceOnce(
  "    \\${renderXmlBuilderDiagnosticsHtml(outputs.diagnostics || {})}\n  </section>`;`,\n    'diagnostics view');",
  "    \\${renderXmlBuilderDiagnosticsHtml(outputs.diagnostics || {})}`,\n    'diagnostics view');",
  'diagnostics after template terminator',
);
replaceOnce(
  "  assert.strictEqual(converted.status, 0, `Python downstream conversion should succeed: \\${converted.stderr || converted.stdout}`);",
  "  assert.strictEqual(converted.status, 0, 'Python downstream conversion should succeed: ' + (converted.stderr || converted.stdout));",
  'downstream assertion template',
);
fs.writeFileSync(path, source);
console.log('Temporary patch quoting repaired.');
