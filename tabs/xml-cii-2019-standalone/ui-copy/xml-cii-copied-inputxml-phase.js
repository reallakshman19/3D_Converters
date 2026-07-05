/**
 * Standalone UI copy: InputXML / Element Side-load phase panel.
 * This is a standalone-only extension surface; it does not modify the existing Model Converters workflow popup.
 */
export function renderCopiedInputXmlPhase({ node, option, addLabel }, card, state) {
  card.appendChild(node('h3', 'InputXML / Element Side-load'));
  card.appendChild(node('p', 'Standalone-only surface for direct CAESARII InputXML and PIPINGELEMENT fragments.', 'xml-cii-phase-help'));

  const sourceKind = addLabel(card, 'Source type:', node('select'));
  sourceKind.dataset.field = 'source-kind';
  sourceKind.append(
    option('auto', 'Auto detect', state.sourceKind === 'auto'),
    option('xml', 'PSI116 XML', state.sourceKind === 'xml'),
    option('inputxml', 'Element-based InputXML', state.sourceKind === 'inputxml'),
  );

  const sourceFile = addLabel(card, 'InputXML / XML file:', node('input'));
  sourceFile.type = 'file';
  sourceFile.accept = '.xml,.XML,.inputxml';
  sourceFile.dataset.field = 'source-file';

  const sourceText = addLabel(card, 'InputXML file/text:', node('textarea'));
  sourceText.value = state.sourceText || '';
  sourceText.placeholder = '<CAESARII XML_TYPE="Input">...</CAESARII> or <PIPINGELEMENT ... />';
  sourceText.dataset.field = 'source-text';

  const sideLoad = addLabel(card, 'elementSideLoadText:', node('textarea'));
  sideLoad.value = state.elementSideLoadText || '';
  sideLoad.placeholder = 'ELEMENT 30-40\nLINE_ID=/ASIM-1836-6"-S8810010-91261M7-HC/B1\nDTXR_POS=Pipe Rest XRT01|GUIDE PDO-TYPE-603';
  sideLoad.dataset.field = 'element-side-load';

  const inputXmlOutputMode = addLabel(card, 'inputXmlOutputMode:', node('select'));
  inputXmlOutputMode.dataset.field = 'inputxml-output-mode';
  inputXmlOutputMode.append(
    option('full-document', 'full-document', state.options.inputXmlOutputMode === 'full-document'),
    option('fragment', 'fragment', state.options.inputXmlOutputMode === 'fragment'),
  );

  const pointPropertiesBasis = addLabel(card, 'pointPropertiesBasis:', node('select'));
  pointPropertiesBasis.dataset.field = 'point-properties-basis';
  pointPropertiesBasis.append(
    option('auto', 'auto', state.options.pointPropertiesBasis === 'auto'),
    option('TO', 'TO', state.options.pointPropertiesBasis === 'TO'),
    option('FROM', 'FROM', state.options.pointPropertiesBasis === 'FROM'),
  );

  const policy = addLabel(card, 'inputXmlRestraintPolicy:', node('select'));
  policy.dataset.field = 'inputxml-restraint-policy';
  for (const [value, label] of [
    ['preserve-existing-restraints', 'preserve-existing-restraints'],
    ['convert-existing-restraints', 'convert-existing-restraints'],
    ['replace-with-dtxr-derived-restraints', 'replace-with-dtxr-derived-restraints'],
    ['merge-existing-and-dtxr-derived-restraints', 'merge-existing-and-dtxr-derived-restraints'],
  ]) policy.append(option(value, label, state.options.inputXmlRestraintPolicy === value));

  const fill = addLabel(card, 'fillSentinelFromLineContext:', node('input'));
  fill.type = 'checkbox';
  fill.checked = state.options.fillSentinelFromLineContext;
  fill.dataset.field = 'fill-sentinel';

  const normalizePressure = addLabel(card, 'normalizePressureCaseNames:', node('input'));
  normalizePressure.type = 'checkbox';
  normalizePressure.checked = state.options.normalizePressureCaseNames;
  normalizePressure.dataset.field = 'pressure-aliases';
}
