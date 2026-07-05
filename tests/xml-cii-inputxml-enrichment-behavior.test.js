const assert = require('assert');
const fs = require('fs');
const path = require('path');

class SimpleElement {
  constructor(name) {
    this.nodeName = name;
    this.localName = name;
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this._textContent = '';
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (!this.parentNode) return;
    const index = this.parentNode.children.indexOf(this);
    if (index >= 0) this.parentNode.children.splice(index, 1);
    this.parentNode = null;
  }

  get textContent() {
    if (this.children.length) return this.children.map((child) => child.textContent).join('');
    return this._textContent;
  }

  set textContent(value) {
    this.children = [];
    this._textContent = String(value ?? '');
  }
}

class SimpleDocument {
  constructor(root) {
    this.documentElement = root;
    this.children = root ? [root] : [];
  }

  createElement(name) {
    return new SimpleElement(name);
  }

  querySelector(selector) {
    if (selector === 'parsererror') return null;
    return null;
  }

  getElementsByTagName(name) {
    const wanted = String(name).toUpperCase();
    const out = [];
    const visit = (node) => {
      if (String(node.localName || node.nodeName).toUpperCase() === wanted) out.push(node);
      for (const child of node.children || []) visit(child);
    };
    if (this.documentElement) visit(this.documentElement);
    return out;
  }
}

function decodeEntities(value) {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function parseAttributes(text, element) {
  const attrPattern = /([A-Za-z_][\w:.-]*)\s*=\s*"([^"]*)"/g;
  let match;
  while ((match = attrPattern.exec(text))) element.setAttribute(match[1], decodeEntities(match[2]));
}

function parseXml(xmlText) {
  const source = String(xmlText).replace(/^\s*<\?xml[^>]*>\s*/i, '');
  const tagPattern = /<[^>]+>|[^<]+/g;
  const stack = [];
  let root = null;
  let token;
  while ((token = tagPattern.exec(source))) {
    const part = token[0];
    if (!part.trim()) continue;
    if (part.startsWith('<!--') || part.startsWith('<?')) continue;
    if (part.startsWith('</')) {
      stack.pop();
      continue;
    }
    if (part.startsWith('<')) {
      const selfClosing = /\/>\s*$/.test(part);
      const body = part.slice(1, selfClosing ? -2 : -1).trim();
      const nameMatch = body.match(/^([^\s/>]+)/);
      if (!nameMatch) continue;
      const element = new SimpleElement(nameMatch[1]);
      parseAttributes(body.slice(nameMatch[1].length), element);
      if (!root) root = element;
      if (stack.length) stack[stack.length - 1].appendChild(element);
      if (!selfClosing) stack.push(element);
      continue;
    }
    if (stack.length) stack[stack.length - 1]._textContent += decodeEntities(part);
  }
  if (!root) throw new Error('No root element parsed.');
  return new SimpleDocument(root);
}

function escapeText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(value) {
  return escapeText(value).replace(/"/g, '&quot;');
}

function serializeNode(node) {
  const attrs = Array.from(node.attributes.entries()).map(([name, value]) => ` ${name}="${escapeAttr(value)}"`).join('');
  if (!node.children.length && !node._textContent) return `<${node.nodeName}${attrs}/>`;
  const children = node.children.map(serializeNode).join('');
  const text = node._textContent ? escapeText(node._textContent) : '';
  return `<${node.nodeName}${attrs}>${text}${children}</${node.nodeName}>`;
}

globalThis.DOMParser = class {
  parseFromString(text) {
    return parseXml(text);
  }
};

globalThis.XMLSerializer = class {
  serializeToString(node) {
    return node instanceof SimpleDocument ? serializeNode(node.documentElement) : serializeNode(node);
  }
};

function loadEnrichmentModule() {
  const root = path.resolve(__dirname, '..');
  const file = path.join(root, 'tabs/xml-cii-2019-standalone/xml-cii-inputxml-enrichment.js');
  const source = fs.readFileSync(file, 'utf8')
    .replace("import { createWorkflowDiagnostics } from './xml-cii-workflow-types.js';", "function createWorkflowDiagnostics(extra = {}) { return { schema: 'xml-cii-2019-workflow-diagnostics/v1', elementCount: 0, enrichedElementCount: 0, restraintCount: 0, sideLoadMatched: 0, sideLoadUnmatched: [], inheritedFieldCount: 0, sentinelFieldCount: 0, warnings: [], ...extra }; }");
  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}

(async () => {
  const { enrichInputXmlDocument, deriveRestraints, extractPipingClassFromLineId } = await loadEnrichmentModule();

  const supportConfig = {
    defaultStiffness: 1751270000000,
    defaultGap: 0,
    defaultFriction: 0.3,
    inputXmlPipingClass: {
      tokenDelimiter: '-',
      tokenPosition: 5,
    },
    inputXmlRatingByPipingClass: {
      91261: '900',
    },
    inputXmlDtxrRestraintRules: [
      { label: 'Y/restraint support', typeCode: 14, patterns: ['PIPE REST', 'SHOE', 'SUPPORT TYPE-103', 'REST'] },
      { label: 'guide restraint', typeCode: 9, friction: -1.0101, patterns: ['GUIDE', 'PDO-TYPE-603'] },
      { label: 'line stop / directional anchor', typeCode: 8, friction: -1.0101, patterns: ['DIRECTIONAL ANCHOR', 'ANCHOR', 'LINE STOP'] },
    ],
  };

  const sourceText = `<PIPINGELEMENT
  FROM_NODE="20.000000"
  TO_NODE="30.000000"
  DELTA_X="-1.010100"
  DELTA_Y="-1.010100"
  DELTA_Z="-353.000000"
  DIAMETER="168.300003"
  WALL_THICK="10.970000"
  INSUL_THICK="80.000000"
  CORR_ALLOW="1.000000"
  TEMP_EXP_C1="325.000000"
  TEMP_EXP_C2="309.000000"
  TEMP_EXP_C3="5.000000"
  PRESSURE1="11600.000000"
  PRESSURE2="-1.010100"
  PRESSURE3="-1.010100"
  MATERIAL_NUM="106.000000"
  FLUID_DENSITY="0.000067"
  INSUL_DENSITY="0.000210"
  HYDRO_PRESSURE="22035.000000"
/>
<PIPINGELEMENT
  FROM_NODE="30.000000"
  TO_NODE="40.000000"
  DELTA_X="-1.010100"
  DELTA_Y="-1.010100"
  DELTA_Z="-1021.179993"
  DIAMETER="-1.010100"
  WALL_THICK="-1.010100"
  INSUL_THICK="-1.010100"
  CORR_ALLOW="-1.010100"
  TEMP_EXP_C1="-1.010100"
  TEMP_EXP_C2="-1.010100"
  TEMP_EXP_C3="-1.010100"
  PRESSURE1="-1.010100"
  PRESSURE2="-1.010100"
  PRESSURE3="-1.010100"
  MATERIAL_NUM="106.000000"
  FLUID_DENSITY="-1.010100"
  INSUL_DENSITY="-1.010100"
  HYDRO_PRESSURE="-1.010100">
  <RESTRAINT NUM="1" NODE="40.000000" TYPE="17.000000"/>
</PIPINGELEMENT>`;

  const elementSideLoadText = `ELEMENT 30-40
LINE_ID=/ASIM-1836-6"-S8810010-91261M7-HC/B1
TO_NAME=PS-14292/DATUM
DTXR_POS=Pipe Rest XRT01|PIPE SUPPORT TYPE-103|PIPE SHOE FOR HORIZ LINES N.B. 3/4" to 24" 6-PDO-TYPE-416A/B-123-450 Carbon Steel|WEAR PLATE TYPE-421 PAD L 550mm|Directional Anchor On Shoe for Hot Insulated Pipe NPS 1/2- 36 6-XST06-40|GUIDE PDO-TYPE-603
DTXR_PS=Pipe Rest XRT01|PIPE SHOE FOR HORIZ LINES N.B. 3/4" to 24" 6-PDO-TYPE-416A/B-130-450 Carbon Steel|PIPE SUPPORT TYPE-103`;

  assert.deepStrictEqual(deriveRestraints({
    DTXR_POS: 'Pipe Rest XRT01|Directional Anchor On Shoe|GUIDE PDO-TYPE-603',
    DTXR_PS: 'PIPE SUPPORT TYPE-103',
  }, supportConfig).map((rule) => rule.typeCode), [14, 9, 8]);

  assert.strictEqual(extractPipingClassFromLineId('/ASIM-1836-6"-S8810010-91261M7-HC/B1', supportConfig), '91261');

  const result = enrichInputXmlDocument({
    sourceKind: 'inputxml',
    sourceName: 'mini.input.xml',
    sourceText,
    elementSideLoadText,
    supportConfigJson: JSON.stringify(supportConfig),
    options: {
      inputXmlOutputMode: 'full-document',
      pointPropertiesBasis: 'TO',
      inputXmlRestraintPolicy: 'replace-with-dtxr-derived-restraints',
      fillSentinelFromLineContext: true,
      normalizePressureCaseNames: true,
      escapeXmlAttributes: true,
    },
  });

  assert.strictEqual(result.ok, true);
  const output = result.enrichedText;
  assert(output.includes('<CAESARII XML_TYPE="Input"'), 'output must contain CAESARII Input root');
  assert(output.includes('<PIPINGMODEL'), 'output must contain PIPINGMODEL');
  assert(output.includes('FROM_NODE="30"'), 'output must normalize FROM_NODE 30');
  assert(output.includes('TO_NODE="40"'), 'output must normalize TO_NODE 40');
  assert(output.includes('LINE_ID="/ASIM-1836-6&quot;-S8810010-91261M7-HC/B1"'), 'LINE_ID quote must be XML-escaped');
  assert(output.includes('<Point_properties_basis>TO</Point_properties_basis>'), 'point basis must be TO');
  assert(output.includes('<DTXR_POS>'), 'DTXR_POS must be serialized');
  assert(output.includes('<DTXR_PS>'), 'DTXR_PS must be serialized');
  assert(output.includes('<PipingClass>91261</PipingClass>'), 'PipingClass must be derived from LINE_ID');
  assert(output.includes('<Rating>900</Rating>'), 'Rating must be derived from PipingClass map');

  const restraintTags = output.match(/<RESTRAINT\b[^>]*NODE="40"[^>]*>/g) || [];
  assert.strictEqual(restraintTags.length, 3, 'node 40 must have exactly three replacement restraints');
  const byType = Object.fromEntries(restraintTags.map((tag) => [tag.match(/TYPE="([^"]+)"/)?.[1], tag]));
  assert(byType['14'], 'TYPE=14 restraint missing');
  assert(byType['9'], 'TYPE=9 restraint missing');
  assert(byType['8'], 'TYPE=8 restraint missing');
  assert(byType['14'].includes('FRIC_COEF="0.3"'), 'TYPE=14 must use default friction 0.3');
  assert(byType['9'].includes('FRIC_COEF="-1.0101"'), 'TYPE=9 must use friction sentinel');
  assert(byType['8'].includes('FRIC_COEF="-1.0101"'), 'TYPE=8 must use friction sentinel');

  assert(result.diagnostics.sideLoadMatched >= 1, 'diagnostics sideLoadMatched must be populated');
  assert(result.diagnostics.inheritedFieldCount > 0, 'diagnostics inheritedFieldCount must prove sentinel inheritance');

  console.log('XML CII InputXML enrichment behavior checks passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
