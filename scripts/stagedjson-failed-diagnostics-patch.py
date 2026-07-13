#!/usr/bin/env python3
"""Apply the staged-only failed-run diagnostics handoff with exact anchors."""
from pathlib import Path


def replace_once(path: str, before: str, after: str, label: str) -> None:
    file_path = Path(path)
    source = file_path.read_text(encoding='utf-8')
    count = source.count(before)
    if count != 1:
        raise RuntimeError(f'{label}: expected one anchor, found {count}')
    file_path.write_text(source.replace(before, after, 1), encoding='utf-8')


replace_once(
    'converters/py-worker.js',
    '''  const invocation = buildInvocation(converterId, primaryPath, primary.name, secondaryPath, options, jobDir);

  await _runPythonScript(pyodide, invocation.scriptPath, invocation.argv, stdout, stderr);

  const sourcePathForHardener =
''',
    '''  const invocation = buildInvocation(converterId, primaryPath, primary.name, secondaryPath, options, jobDir);

  let stagedConversionError = null;
  try {
    await _runPythonScript(pyodide, invocation.scriptPath, invocation.argv, stdout, stderr);
  } catch (error) {
    if (converterId !== 'stagedjson_to_inputxml') throw error;
    stagedConversionError = error;
  }

  if (stagedConversionError) {
    const diagnosticsName = invocation.outputName.replace(/\\.xml$/i, '_stagedjson_to_inputxml_diagnostics.json');
    const diagnosticsPath = invocation.outputPath.replace(/\\.xml$/i, '_stagedjson_to_inputxml_diagnostics.json');
    try {
      const diagnosticsText = pyodide.FS.readFile(diagnosticsPath, { encoding: 'utf8' });
      const diagnostics = JSON.parse(diagnosticsText);
      return {
        output: [{ name: diagnosticsName, text: diagnosticsText, mime: 'application/json;charset=utf-8' }],
        logs: {
          stdout: decodeLogBatches(stdout),
          stderr: decodeLogBatches(stderr),
          argv: invocation.argv.slice(1),
          diagnostics,
          failed: true,
          failureMessage: _errorToString(stagedConversionError),
        },
      };
    } catch {
      throw stagedConversionError;
    }
  }

  const sourcePathForHardener =
''',
    'staged failure diagnostics handoff',
)

replace_once(
    'converters/scripts/stagedjson_to_inputxml.py',
    '''# ---------------------------------------------------------------------------
# CLI# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
''',
    '''# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
''',
    'duplicate CLI heading',
)

print('StagedJSON failed-run diagnostics handoff applied.')
