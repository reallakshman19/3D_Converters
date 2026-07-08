import { buildCustomInputModel, summarizeCustomInputModel } from '../../../converters/xml-cii2019-core/custom-input-model.js';
import { buildCustomInputXml } from '../../../converters/xml-cii2019-core/custom-input-xml-builder.js';
import { parseSelJsonToInputSource, selJsonTraceToCsv } from '../../../converters/xml-cii2019-core/custom-input-seljson-source.js';
import { decodeTextUtf8, baseNameWithoutExtension } from '../core/output-utils.js';

/**
 * Runs SelJson -> InputXML from 3DV Conv JSON exports.
 * Parameters: converter context with a primary rvm-converter-stage/v1 JSON file.
 * Outputs: generated custom InputXML, audit JSON, and trace CSV.
 * Fallback: unsupported geometry is audited and skipped; short-node dropping is
 * disabled unless explicitly enabled so Position records remain available.
 */

function primaryInput(context) {
  const primary = context?.inputFiles?.find((file) => file.role === 'primary');
  if (!primary || !primary.bytes) throw new Error('Primary 3DV Conv JSON input is required for SelJson -> InputXML conversion.');
  return primary;
}

function writerOptions(options) {
  return {
    ...(options || {}),
    dropShortElementLengthNodes: options?.dropShortElementLengthNodes === true,
  };
}

export async function run(context) {
  const primary = primaryInput(context);
  const selJsonText = decodeTextUtf8(primary.bytes);
  const parsed = parseSelJsonToInputSource(selJsonText, context.options || {});
  const model = buildCustomInputModel(parsed.rows);
  const xmlText = buildCustomInputXml(model, writerOptions(context.options || {}));
  const modelSummary = summarizeCustomInputModel(model);
  const stem = baseNameWithoutExtension(primary.name);
  const audit = {
    schema: 'seljson-to-inputxml-audit/v1',
    inputName: primary.name,
    converter: context.converterId || 'seljson_to_inputxml',
    source: parsed.summary,
    modelSummary,
    diagnostics: parsed.diagnostics,
  };
  context.setStatus?.(`SelJson parsed: ${parsed.summary.emittedItems} item(s), ${modelSummary.nodes} node(s), ${modelSummary.branches} branch(es).`, 'ok');
  return {
    ok: true,
    outputs: [
      { name: `${stem}_seljson_to_inputxml.xml`, text: xmlText, mime: 'application/xml;charset=utf-8' },
      { name: `${stem}_seljson_to_inputxml.audit.json`, text: JSON.stringify(audit, null, 2), mime: 'application/json;charset=utf-8' },
      { name: `${stem}_seljson_to_inputxml.trace.csv`, text: selJsonTraceToCsv(parsed.trace), mime: 'text/csv;charset=utf-8' },
    ],
    logs: {
      stdout: [
        `SelJson source kind: ${parsed.summary.sourceKind}`,
        `Selected items: ${parsed.summary.selectedItems}`,
        `Emitted items: ${parsed.summary.emittedItems}`,
        `Emitted nodes: ${modelSummary.nodes}`,
        `Branches: ${modelSummary.branches}`,
      ],
      stderr: parsed.diagnostics.map((entry) => `${entry.severity || 'info'} ${entry.code || ''}: ${entry.message || ''}`),
    },
  };
}
