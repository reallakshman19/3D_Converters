/**
 * XML229 WBS 1.1/1.2: source-position-preserving, connected-coordinate vertex index.
 *
 * NON-AUTHORIZING SHADOW INDEX. This never moves a Node, chooses a staged support
 * owner, modifies a Final packet, or assigns accepted kg. Identical XYZ is not,
 * by itself, an edge; only adjacent occurrences in an original Branch and
 * independently verified branch-connection aliases can join vertices.
 *
 * Source occurrences stay distinct from physical vertices; negative NodeNumber
 * placeholders are NOT topology identifiers. This index reads ORIGINAL XML
 * before Preview's node removal, positive renumbering or rigid promotion.
 */
export const XML229_ORIGINAL_VERTEX_SCHEMA='XML229.OriginalPhysicalVertices.v1';

const tag=n=>String(n?.localName||n?.nodeName||'').replace(/^.*:/,'');
const children=(p,n)=>[...(p?.childNodes||[])].filter(c=>c?.nodeType===1&&tag(c)===n);
const field=(p,n)=>String(children(p,n)[0]?.textContent??'').trim();
const key=(b,n)=>JSON.stringify([b,n]);
function error(code){const e=new Error(code);e.code=code;throw e;}

/**
 * Decimal canonicalization without IEEE-754 rounding or coordinate snapping.
 * 1, 1.000 and 1e0 become the same exact value; 1.000000000000000001
 * remains different. Input units must already be source XML native units.
 */
export function canonicalXml229Decimal(value){
  const raw=String(value??'').trim();
  const m=raw.match(/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/);
  if(!m)return null;
  let digits=(m[2]||'')+(m[3]??m[4]??'');
  const places=(m[3]??m[4]??'').length;
  const exponent=Number(m[5]||0)-places;
  if(!Number.isSafeInteger(exponent)||Math.abs(exponent)>100000)return null;
  digits=digits.replace(/^0+/,'');
  if(!digits)return '0';
  const trailing=digits.match(/0+$/)?.[0]?.length||0;
  if(trailing)digits=digits.slice(0,-trailing);
  return (m[1]==='-'?'-':'')+digits+'e'+(exponent+trailing);
}

export function exactXml229Position(value){
  const raw=String(value??'').trim();
  if(!raw)return null;
  // XML229 Position fields are three whitespace-separated decimal scalars.
  const pieces=raw.split(/\s+/);
  if(pieces.length!==3)return null;
  const xyz=pieces.map(canonicalXml229Decimal);
  return xyz.some(v=>v===null)?null:JSON.stringify(xyz);
}

function rootIndex(parent,i){
  while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}
  return i;
}
function unite(parent,a,b){
  let x=rootIndex(parent,a),y=rootIndex(parent,b);
  if(x===y)return false;
  // The earliest original source occurrence is the stable representative.
  if(x>y)[x,y]=[y,x];
  parent[y]=x;
  return true;
}

export function indexXml229OriginalPhysicalVertices({xmlText,sourceXmlSha256='',branchConnectionAliases=[]}={}){
  if(typeof DOMParser==='undefined')error('XML229_VERTEX_DOM_UNAVAILABLE');
  if(typeof xmlText!=='string'||!xmlText.trim())error('XML229_VERTEX_SOURCE_REQUIRED');
  const document=new DOMParser().parseFromString(xmlText,'application/xml');
  if(document.getElementsByTagName('parsererror').length)error('XML229_VERTEX_XML_INVALID');
  const branches=[...document.getElementsByTagName('Branch')];
  const rows=[],byOriginal=new Map(),parent=[];
  let intraBranchUnions=0,invalidPositionCount=0,consecutiveNoncoincident=0;
  for(const [bi,branch] of branches.entries()){
    const nodes=children(branch,'Node');
    let previous=-1;
    for(const [ni,node] of nodes.entries()){
      const pos=field(node,'Position'),coordinateKey=exactXml229Position(pos);
      if(coordinateKey===null)invalidPositionCount++;
      const row=Object.freeze({
        branchOccurrenceIndex:bi,sourceNodeOrdinal:ni,
        sourceNodeNumber:field(node,'NodeNumber'),
        coordinateKey,positionRaw:pos,
      });
      const index=rows.length;
      rows.push(row);parent.push(index);byOriginal.set(key(bi,ni),index);
      if(previous>=0){
        if(coordinateKey!==null&&coordinateKey===rows[previous].coordinateKey){
          if(unite(parent,previous,index))intraBranchUnions++;
        }else consecutiveNoncoincident++;
      }
      previous=index;
    }
  }
  let crossBranchUnions=0;
  const aliases=Array.isArray(branchConnectionAliases)?branchConnectionAliases:null;
  if(aliases===null)error('XML229_VERTEX_ALIASES_INVALID');
  const seenAliases=new Set();
  for(const link of aliases){
    const ak=key(link?.aliasBranchOccurrenceIndex,link?.aliasSourceNodeOrdinal);
    const tk=key(link?.terminalBranchOccurrenceIndex,link?.terminalSourceNodeOrdinal);
    if(seenAliases.has(ak))error('XML229_VERTEX_ALIAS_DUPLICATED');
    seenAliases.add(ak);
    const ai=byOriginal.get(ak),ti=byOriginal.get(tk);
    if(ai===undefined||ti===undefined)error('XML229_VERTEX_ALIAS_UNKNOWN_SOURCE');
    const a=rows[ai],t=rows[ti];
    if(a.coordinateKey===null||a.coordinateKey!==t.coordinateKey)
      error('XML229_VERTEX_ALIAS_COORDINATE_DRIFT');
    // These are typed, upstream-reviewed branch aliases, NOT arbitrary pairs
    // of coincident records. The producer must verify branch connectivity.
    if(unite(parent,ai,ti))crossBranchUnions++;
  }
  const canonical=new Map(),vertexOfOccurrence=[],vertexSizes=new Map(),coordToVertices=new Map();
  for(let i=0;i<rows.length;i++){
    const rep=rootIndex(parent,i);
    const id=key(rows[rep].branchOccurrenceIndex,rows[rep].sourceNodeOrdinal);
    canonical.set(rep,id);vertexOfOccurrence.push(id);
    vertexSizes.set(id,(vertexSizes.get(id)||0)+1);
    const coord=rows[i].coordinateKey;
    if(coord!==null){
      if(!coordToVertices.has(coord))coordToVertices.set(coord,new Set());
      coordToVertices.get(coord).add(id);
    }
  }
  const summary=Object.freeze({
    schema:XML229_ORIGINAL_VERTEX_SCHEMA,
    sourceXmlSha256,
    originalBranchCount:branches.length,
    originalNodeOccurrences:rows.length,
    physicalVertexCount:vertexSizes.size,
    intrabranchZeroSpanUnions:intraBranchUnions,
    reviewedCrossBranchAliasUnions:crossBranchUnions,
    invalidOrMissingPositions:invalidPositionCount,
    consecutiveNoncoincident,
    distinctSameCoordinateStations:[...coordToVertices.values()].filter(v=>v.size>1).length,
    nodeNumbersRewritten:0,
    positionsRewritten:0,
    weightOwnersChanged:0,
    nativeReleaseAuthorized:false,
  });
  return {
    summary,
    // Original occurrence and native positive NodeNumber intentionally remain
    // separate identity dimensions. No CII assignment happens in this stage.
    sourceOccurrences:Object.freeze(rows),
    vertexOfOccurrence:Object.freeze(vertexOfOccurrence),
    vertexForOriginal:(branchOccurrenceIndex,sourceNodeOrdinal)=>{
      const i=byOriginal.get(key(branchOccurrenceIndex,sourceNodeOrdinal));
      return i===undefined?null:vertexOfOccurrence[i];
    },
    vertexSizes,
  };
}
