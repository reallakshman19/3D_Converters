const ALL_SCOPE_ID = '__ALL__';
const UNSCOPED_ID = '__UNSCOPED__';
// Legacy string materializer must not become an unbounded main-thread fallback.
// This is a code-unit safety gate; only R10 Worker can process larger sources.
const LEGACY_MAX_CODE_UNITS = 1048576;
// Keep immutable original source association outside the serializable index.
// Reusing source ranges on even an equal-length different string is forbidden.
const sourceForIndex = new WeakMap();
function scopeError(code, detail) {
  const e = new Error(detail);
  e.code = code;
  throw e;
}
function requireLegacySource(source) {
  if (source.length > LEGACY_MAX_CODE_UNITS)
    scopeError('SOURCE_SCOPE_WORKER_REQUIRED','oversized source needs a qualified LFJ Worker-backed scoped reader');
}
function boundIndex(index, source) {
  sourceForIndex.set(index, source);
  return index;
}

function text(value) {
  return String(value ?? '').trim();
}

function decodeJsonString(raw) {
  if (!raw) return '';
  try { return JSON.parse('"' + raw + '"'); } catch { return raw; }
}

// Only direct item fields and direct "attributes" members can assign ownership.
// Regex over the entire slice reads a descendant's OWNER_ZONE as the ancestor's;
// this scan excludes fields inside descendant children.
// This remains a small-source legacy UI adapter, NOT a substitute for R10 Worker.
function ownStringFields(source) {
  const wanted=new Set(['type','name','OWNER_ZONE','ZONE_ID','OWNER_SITE','SITE','ZONE']);
  const values=new Map();
  const ownOwnerKeys=new Set(['OWNER_ZONE','ZONE_ID','OWNER_SITE','SITE','ZONE']);
  const white=c=>c===' '||c==='\n'||c==='\r'||c==='\t';
  function endQuote(from){
    for(let i=from+1;i<source.length;i++){
      if(source[i]==='\\'){i++;continue;}
      if(source[i]==='"')return i;
    }
    throw new SyntaxError('Unterminated JSON string in original hierarchy item');
  }
  let depth=0,ownAttributesDepth=-1;
  for(let i=0;i<source.length;i++){
    const char=source[i];
    if(char==='"'){
      const end=endQuote(i);
      if(depth===1||depth===ownAttributesDepth){
        let colon=end+1;
        while(white(source[colon]))colon++;
        if(source[colon]===':'){
          const key=JSON.parse(source.slice(i,end+1));
          let valueStart=colon+1;
          while(white(source[valueStart]))valueStart++;
          // A BRANCH's direct attributes object is its *own* metadata.
          // The identically named attributes under children are NOT.
          if(depth===1&&key==='attributes'&&source[valueStart]==='{')
            ownAttributesDepth=depth+1;
          if(wanted.has(key)&&(depth===1||ownOwnerKeys.has(key))){
            if(source[valueStart]==='"'){
              const valueEnd=endQuote(valueStart);
              values.set(key,JSON.parse(source.slice(valueStart,valueEnd+1)));
              i=valueEnd;continue;
            }
            values.delete(key);
          }
        }
      }
      i=end;
    }else if(char==='{'||char==='['){depth++;}
    else if(char==='}'||char===']'){
      if(depth===ownAttributesDepth)ownAttributesDepth=-1;
      depth--;
    }
  }
  return values;
}

function matchingBracket(source, start, open, close) {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function rootArrayRegion(source) {
  const start = source.search(/\S/);
  if (start < 0) return null;
  if (source[start] === '[') {
    const end = matchingBracket(source, start, '[', ']');
    return end > start ? { start, end, strategy: 'root-array' } : null;
  }
  if (source[start] !== '{') return null;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  let tokenStart = -1;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') {
        quoted = false;
        if (depth === 1 && tokenStart >= 0) {
          const key = decodeJsonString(source.slice(tokenStart, i));
          let cursor = i + 1;
          while (/\s/.test(source[cursor] || '')) cursor += 1;
          if (key === 'children' && source[cursor] === ':') {
            cursor += 1;
            while (/\s/.test(source[cursor] || '')) cursor += 1;
            if (source[cursor] === '[') {
              const end = matchingBracket(source, cursor, '[', ']');
              if (end > cursor) return { start: cursor, end, strategy: 'root-children-array' };
            }
          }
        }
        tokenStart = -1;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      tokenStart = i + 1;
    } else if (char === '{' || char === '[') depth += 1;
    else if (char === '}' || char === ']') depth -= 1;
  }
  return null;
}

function arrayItemRanges(source, region) {
  const out = [];
  let quoted = false;
  let escaped = false;
  let depth = 0;
  let itemStart = -1;
  for (let i = region.start + 1; i < region.end; i += 1) {
    const char = source[i];
    if (!quoted && depth === 0 && char !== '{' && char !== ',' && !/\s/.test(char))
      scopeError('SOURCE_SCOPE_UNSUPPORTED_ITEM','mixed/primitive hierarchy items require original Worker-index selection');
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === '{' || char === '[') {
      if (depth === 0 && itemStart < 0) itemStart = i;
      depth += 1;
    } else if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 0 && itemStart >= 0) {
        out.push({ start: itemStart, end: i + 1 });
        itemStart = -1;
      }
    }
  }
  return out;
}

function itemMetadata(source, range, itemIndex) {
  const slice = source.slice(range.start, range.end);
  const fields = ownStringFields(slice);
  const type = (fields.get('type') || '').toUpperCase();
  const name = fields.get('name') || '';
  const ownerScope = ['OWNER_ZONE','ZONE_ID','OWNER_SITE','SITE','ZONE']
    .map(key=>fields.get(key)).find(value=>text(value)) || '';
  const explicitContainer = ['SITE', 'ZONE', 'GROUP'].includes(type);
  const scopeId = text(explicitContainer ? (name || ownerScope) : ownerScope) || UNSCOPED_ID;
  return {
    itemIndex,
    start: range.start,
    end: range.end,
    byteLength: range.end - range.start,
    type,
    branchName: type === 'BRANCH' ? name : '',
    scopeId,
  };
}

function scopeRows(items) {
  const map = new Map();
  for (const item of items) {
    const current = map.get(item.scopeId) || {
      id: item.scopeId,
      label: item.scopeId === UNSCOPED_ID ? 'Unscoped' : item.scopeId,
      itemCount: 0,
      byteLength: 0,
      items: [],
    };
    current.itemCount += 1;
    current.byteLength += item.byteLength;
    current.items.push(item);
    map.set(item.scopeId, current);
  }
  return [...map.values()];
}

export function buildJsonHierarchyScopeIndex(stagedJsonText) {
  const source = String(stagedJsonText || '');
  requireLegacySource(source);
  const region = rootArrayRegion(source);
  if (!region) {
    return boundIndex({
      schema: 'xml-cii-json-hierarchy-scope/v1',
      indexable: false,
      strategy: 'full-json-fallback',
      byteLength: source.length,
      itemCount: 0,
      scopes: [],
      defaultScopeId: ALL_SCOPE_ID,
    }, source);
  }
  const items = arrayItemRanges(source, region).map((range, index) => itemMetadata(source, range, index));
  const scopes = scopeRows(items);
  return boundIndex({
    schema: 'xml-cii-json-hierarchy-scope/v1',
    indexable: items.length > 0,
    strategy: region.strategy,
    byteLength: source.length,
    itemCount: items.length,
    scopes,
    defaultScopeId: scopes[0]?.id || ALL_SCOPE_ID,
  }, source);
}

export function materializeJsonHierarchyScope(stagedJsonText, index, scopeId) {
  const source = String(stagedJsonText || '');
  requireLegacySource(source);
  if (!index || sourceForIndex.get(index) !== source)
    scopeError('SOURCE_SCOPE_STALE','original source differs from indexed source or index is untrusted');
  const selectedId = text(scopeId) || index.defaultScopeId || ALL_SCOPE_ID;
  if (selectedId !== ALL_SCOPE_ID && !index.indexable)
    scopeError('SOURCE_SCOPE_UNKNOWN','unsupported original envelope has no requested named scope');
  if (selectedId === ALL_SCOPE_ID) {
    return { scopeId: ALL_SCOPE_ID, value: JSON.parse(source), itemCount: index.itemCount || 0 };
  }
  const scope = (index.scopes || []).find((item) => item.id === selectedId);
  if (!scope) scopeError('SOURCE_SCOPE_UNKNOWN','unknown or superseded JSON hierarchy scope: '+selectedId);
  const value = scope.items.map((item) => JSON.parse(source.slice(item.start, item.end)));
  return { scopeId: selectedId, value, itemCount: scope.itemCount };
}

export function jsonHierarchyScopeOptions(index) {
  return [
    ...(index?.scopes || []).map(({ id, label, itemCount, byteLength }) => ({ id, label, itemCount, byteLength })),
    { id: ALL_SCOPE_ID, label: 'All scopes', itemCount: index?.itemCount || 0, byteLength: index?.byteLength || 0 },
  ];
}

export { ALL_SCOPE_ID, UNSCOPED_ID };
