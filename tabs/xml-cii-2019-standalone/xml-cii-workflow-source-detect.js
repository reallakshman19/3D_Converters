const XML_ROOT_PATTERN = /<\s*(?:[A-Za-z_][\w.-]*:)?([A-Za-z_][\w.-]*)\b([^>]*)>/i;

function attrValue(attrs, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i');
  return String(attrs || '').match(pattern)?.[1] || '';
}

export function detectXmlCiiWorkflowSourceKind(sourceText, fallback = 'xml') {
  const text = String(sourceText || '').trim();
  if (!text) return fallback === 'inputxml' ? 'inputxml' : 'xml';

  const rootMatch = text.match(XML_ROOT_PATTERN);
  const rootName = String(rootMatch?.[1] || '').toLowerCase();
  const rootAttrs = rootMatch?.[2] || '';

  if (rootName === 'pipestressexport') return 'xml';

  if (rootName === 'caesarii') {
    const xmlType = attrValue(rootAttrs, 'XML_TYPE').toLowerCase();
    if (xmlType === 'input' || /<\s*(?:[A-Za-z_][\w.-]*:)?PIPINGMODEL\b/i.test(text)) return 'inputxml';
  }

  if (/<\s*(?:[A-Za-z_][\w.-]*:)?PipeStressExport\b/i.test(text)) return 'xml';
  if (/<\s*(?:[A-Za-z_][\w.-]*:)?CAESARII\b/i.test(text) && /<\s*(?:[A-Za-z_][\w.-]*:)?PIPINGELEMENT\b/i.test(text)) return 'inputxml';

  return fallback === 'inputxml' ? 'inputxml' : 'xml';
}

export function workflowSourceKindLabel(sourceKind) {
  return sourceKind === 'inputxml' ? 'Element-based InputXML' : 'PSI116 XML';
}

export function workflowOutputKindForSource(sourceKind) {
  return sourceKind === 'inputxml' ? 'enrichedInputXML' : 'enrichedXML';
}
