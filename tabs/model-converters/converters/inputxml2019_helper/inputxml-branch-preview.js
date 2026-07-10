/**
 * Client-side, read-only preview of a loaded CAESAR II Input XML file for the
 * InputXML -> CII(2019) config popup. Enumerates PIPINGELEMENT entries (and
 * their nested RESTRAINT rows), grouping contiguous FROM_NODE/TO_NODE chains
 * into "branches" (this XML dialect has no explicit branch/line attribute),
 * and flags which fields fall back to a Tab 2 global default because the
 * source XML omitted them. Attribute names mirror the ones actually read by
 * converters/scripts/inputxml_to_cii2019.py (PIPINGELEMENT/DIAMETER,
 * WALL_THICK, INSUL_THICK, CORR_ALLOW, TEMP_EXP_C1-3; RESTRAINT/NUM, NODE,
 * TYPE, STIFFNESS, GAP, FRIC_COEF, CNODE, XCOSINE/YCOSINE/ZCOSINE, TAG, GUID).
 */

const FIELD_SPECS = Object.freeze([
  { key: 'diameter', attr: 'DIAMETER', defaultKey: 'defaultDiameter', label: 'Diameter' },
  { key: 'wallThickness', attr: 'WALL_THICK', defaultKey: 'defaultWallThickness', label: 'Wall Thickness' },
  { key: 'insulationThickness', attr: 'INSUL_THICK', defaultKey: 'defaultInsulationThickness', label: 'Insulation Thickness' },
  { key: 'corrosionAllowance', attr: 'CORR_ALLOW', defaultKey: 'defaultCorrosionAllowance', label: 'Corrosion Allowance' },
  { key: 'temperature1', attr: 'TEMP_EXP_C1', defaultKey: 'defaultTemperature1', label: 'Temperature1' },
  { key: 'temperature2', attr: 'TEMP_EXP_C2', defaultKey: 'defaultTemperature2', label: 'Temperature2' },
  { key: 'temperature3', attr: 'TEMP_EXP_C3', defaultKey: 'defaultTemperature3', label: 'Temperature3' },
]);

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function decodeEntities(value) {
  return text(value)
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function attrsFromOpenTag(openTag) {
  const attrs = {};
  const pattern = /([A-Za-z_][\w.:-]*)\s*=\s*"([^"]*)"/g;
  let match;
  while ((match = pattern.exec(openTag))) attrs[match[1].toUpperCase()] = decodeEntities(match[2]);
  return attrs;
}

function elementBlocks(xmlText) {
  // Self-closing form must be tried first: a non-greedy "open...close" match
  // would otherwise stop at the first nested self-closing child tag (e.g. a
  // <RESTRAINT .../> inside the element) instead of </PIPINGELEMENT>.
  return text(xmlText).match(/<PIPINGELEMENT\b[^>]*\/>|<PIPINGELEMENT\b[^>]*>[\s\S]*?<\/PIPINGELEMENT>/gi) || [];
}

function openTagOf(block) {
  return text(block).match(/<PIPINGELEMENT\b[^>]*>/i)?.[0] || block;
}

function restraintsOf(block) {
  const selfClosing = text(block).match(/<RESTRAINT\b[^>]*\/>/gi) || [];
  const paired = text(block).match(/<RESTRAINT\b[^>]*>[\s\S]*?<\/RESTRAINT>/gi) || [];
  return [...selfClosing, ...paired].map((tag) => attrsFromOpenTag(tag));
}

function numericOrNull(value) {
  const raw = text(value);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function fieldRowsForElement(attrs, defaults) {
  return FIELD_SPECS.map((spec) => {
    const raw = attrs[spec.attr];
    const value = numericOrNull(raw);
    const usedDefault = value === null;
    return {
      key: spec.key,
      label: spec.label,
      sourceValue: value,
      appliedValue: usedDefault ? numericOrNull(defaults?.[spec.defaultKey]) ?? 0 : value,
      usedDefault,
    };
  });
}

/**
 * Parses the loaded InputXML text into branch-grouped element rows (for the
 * "Branch-wise data & defaults" tab) and a flat restraint list (to seed the
 * Support Mapping tab). Never throws on malformed input — returns an empty
 * result with a diagnostic instead, since this only powers a preview.
 */
export function parseInputXmlForBranchPreview(xmlText, defaults = {}) {
  const blocks = elementBlocks(xmlText);
  if (!blocks.length) {
    return { ok: false, branches: [], elements: [], restraints: [], stats: { elementCount: 0, branchCount: 0, restraintCount: 0 }, diagnostics: [{ type: 'inputxml-branch-preview-empty', message: 'No PIPINGELEMENT entries found in the loaded InputXML.' }] };
  }

  const elements = [];
  const restraints = [];

  blocks.forEach((block, index) => {
    const attrs = attrsFromOpenTag(openTagOf(block));
    const fromNode = text(attrs.FROM_NODE);
    const toNode = text(attrs.TO_NODE);
    const fields = fieldRowsForElement(attrs, defaults);
    elements.push({ index, fromNode, toNode, fields, usedDefaultCount: fields.filter((field) => field.usedDefault).length });

    restraintsOf(block).forEach((restraintAttrs) => {
      restraints.push({
        elementIndex: index,
        fromNode,
        toNode,
        num: text(restraintAttrs.NUM),
        node: text(restraintAttrs.NODE),
        type: text(restraintAttrs.TYPE),
        stiffness: text(restraintAttrs.STIFFNESS),
        gap: text(restraintAttrs.GAP),
        friction: text(restraintAttrs.FRIC_COEF ?? restraintAttrs.MU),
        connectingNode: text(restraintAttrs.CNODE),
        tag: text(restraintAttrs.TAG),
        guid: text(restraintAttrs.GUID),
      });
    });
  });

  const branches = [];
  let current = null;
  for (const element of elements) {
    if (!current || current.elements[current.elements.length - 1].toNode !== element.fromNode) {
      current = { branchIndex: branches.length, fromNode: element.fromNode, elements: [] };
      branches.push(current);
    }
    current.elements.push(element);
  }
  for (const branch of branches) {
    branch.toNode = branch.elements[branch.elements.length - 1]?.toNode || '';
    branch.usedDefaultCount = branch.elements.reduce((sum, element) => sum + element.usedDefaultCount, 0);
  }

  return {
    ok: true,
    branches,
    elements,
    restraints,
    stats: { elementCount: elements.length, branchCount: branches.length, restraintCount: restraints.length },
    diagnostics: [],
  };
}
