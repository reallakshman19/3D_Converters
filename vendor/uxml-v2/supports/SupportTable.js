/**
 * Support table of a UXML v2 document (UXML revamp step 3): the same shape the step-3 oracle
 * fixtures use (`fixtures/uxml-v2-supports/oracle/<BENCH>/*-table.json`), so a revision can be
 * compared with today's live step-10 chain node by node.
 *
 * supportTableOf(doc) -> [{branch, nodeIndex, NodeNumber, NodeName, ComponentType,
 *                          support: {tag: text}, restraints: [{tag: text}]}]
 *   - one row per component, in document order;
 *   - `support` holds the node's own leaf values whose tag matches SUPPORT_FIELD; a repeated tag
 *     (`K`, `K#2`, ...) gives one entry joined with ' | ' (as the oracle joins repeated elements);
 *   - nested groups (keys with '.') are not leaf children of the node and are left out;
 *   - every restraint maps each of its leaf tags to its trimmed text.
 */
export const SUPPORT_FIELD = /^(DTXR_|CMPSUPGAP|SUPPORT|SUPP|ATTA|MDS|REST)/i;

const ENTITIES = {lt: '<', gt: '>', amp: '&', quot: '"', apos: "'"};
/** XML literal -> the string a DOM's textContent gives (entities and CDATA decoded). */
export function decodeXmlText(raw) {
  const s = String(raw);
  const cdata = /^\s*<!\[CDATA\[([\s\S]*)\]\]>\s*$/.exec(s);
  if (cdata) return cdata[1];
  return s.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|amp|quot|apos);/gi, (m, e) => {
    if (e[0] !== '#') return ENTITIES[e.toLowerCase()];
    return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
  });
}
/** Text of a UXML value as a DOM reads it (decoded, trimmed); a stage-made value without text uses v. */
export const valueText = value => (typeof value?.text === 'string'
  ? decodeXmlText(value.text) : String(value?.v == null ? '' : value.v)).trim();

const baseKey = key => String(key).split('#')[0];

/** Leaf values of an entity as {tag: text}; repeats joined in field order. */
export function leafTexts(entity, {join = true} = {}) {
  const out = {};
  const keys = [...new Set([...(entity.fieldOrder || []), ...Object.keys(entity.values || {})])];
  for (const key of keys) {
    const value = entity.values?.[key];
    if (!value || key.includes('.')) continue;
    const tag = baseKey(key);
    const text = valueText(value);
    out[tag] = join && out[tag] !== undefined ? out[tag] + ' | ' + text : text;
  }
  return out;
}

/** One table row for a component. */
export function supportRow(pipeline, component, nodeIndex) {
  const fields = leafTexts(component);
  return {
    branch: valueText(pipeline.values?.Branchname),
    nodeIndex,
    NodeNumber: fields.NodeNumber ?? '',
    NodeName: fields.NodeName ?? '',
    ComponentType: fields.ComponentType ?? '',
    support: Object.fromEntries(Object.entries(fields).filter(([tag]) => SUPPORT_FIELD.test(tag))),
    restraints: (component.restraints || []).map(r => leafTexts(r, {join: false})),
  };
}

/** The support table of a whole UXML doc, one row per component. */
export function supportTableOf(doc) {
  return (doc.pipelines || []).flatMap(p => (p.components || []).map((c, i) => supportRow(p, c, i)));
}
