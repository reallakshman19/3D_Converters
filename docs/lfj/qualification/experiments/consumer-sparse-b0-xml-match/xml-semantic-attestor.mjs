/**
 * LFJ B0 research adapter: independent XML semantic attestation.
 * Deliberately separate from shipping regex field/branch extraction.
 * Reject a discrepancy before either production CSV serializer can run.
 * Source-only guard: does NOT authorize production exports.
 */
const invalid = reason => {
  throw Object.assign(new Error('Unattestable XML: '+reason),
    {code:'XML_SEMANTIC_DOCUMENT_INVALID'});
};
const mismatch=(field,index,expected,actual)=>{
  throw Object.assign(new Error('XML semantic mismatch at occurrence '+index+': '+field),
    {code:'XML_SEMANTIC_MISMATCH',field,xmlIndex:index,expected,actual});
};
const trim=value=>String(value??'').trim();
const namePattern=/^[A-Za-z_:][A-Za-z0-9_.:-]*/;
const white=char=>char===' '||char==='\t'||char==='\n'||char==='\r';
const local=name=>name.includes(':')?name.slice(name.indexOf(':')+1):name;
const nodeKeys=['NodeNumber','NodeName','ComponentType','ComponentRefNo',
  'Position','DTXR_POS','DtxrPos','DTXR_PS','DtxrPs'];
const branchKeys=['Branchname','BranchName','LineNo','LineKey'];
const fieldNames=new Set([...nodeKeys,...branchKeys]);
function scalar(cp){
  return cp===9||cp===10||cp===13||(cp>=32&&cp<=0xd7ff)||
    (cp>=0xe000&&cp<=0xfffd)||(cp>=0x10000&&cp<=0x10ffff);
}
function decode(raw){
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(raw))invalid('XML controls');
  const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
  return raw.replace(/&([^;&]{1,24});|&/g,(token,entity)=>{
    if(!entity)invalid('unterminated/invalid entity');
    if(Object.hasOwn(named,entity))return named[entity];
    if(!/^#(?:[0-9]+|x[0-9a-fA-F]+)$/.test(entity))
      invalid('undeclared entity '+entity);
    const hex=entity[1]==='x';
    const cp=Number.parseInt(entity.slice(hex?2:1),hex?16:10);
    if(!Number.isSafeInteger(cp)||!scalar(cp))invalid('invalid numeric entity');
    return String.fromCodePoint(cp);
  });
}
function attributes(raw){
  const attrs={};
  const root=raw.match(namePattern);
  if(!root)invalid('start-tag name');
  let i=root[0].length;
  while(i<raw.length){
    const before=i;
    while(white(raw[i]))i++;
    if(i>=raw.length)break;
    if(i===before)invalid('attribute whitespace');
    const name=raw.slice(i).match(namePattern);
    if(!name)invalid('attribute name');
    i+=name[0].length;
    while(white(raw[i]))i++;
    if(raw[i++]!=='=')invalid('attribute equals');
    while(white(raw[i]))i++;
    const q=raw[i++];
    if(q!=='"'&&q!=="'")invalid('attribute quote');
    const end=raw.indexOf(q,i);
    if(end<0)invalid('unterminated attribute');
    const value=decode(raw.slice(i,end));
    if(Object.hasOwn(attrs,name[0]))invalid('duplicate attribute');
    attrs[name[0]]=value;
    i=end+1;
  }
  return {name:root[0],attrs};
}
function point(value){
  if(value===null||value===undefined||value==='')return null;
  if(Array.isArray(value)){
    const [x,y,z]=value.map(Number);
    return [x,y,z].every(Number.isFinite)?{x,y,z}:null;
  }
  if(typeof value==='object'){
    const x=Number(value.x??value.X??value.E??value.east);
    const y=Number(value.y??value.Y??value.N??value.north);
    const z=Number(value.z??value.Z??value.U??value.EL??value.elev??value.elevation);
    return [x,y,z].every(Number.isFinite)?{x,y,z}:null;
  }
  const source=trim(value),directional={};
  source.replace(/\b(E|W|N|S|U|D|EL)\s*[:=]?\s*(-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?)/gi,
    (_,axis,raw)=>{
      const numeric=Number(raw),key=axis.toUpperCase();
      if(!Number.isFinite(numeric))return '';
      if(key==='E')directional.x=numeric;
      else if(key==='W')directional.x=-numeric;
      else if(key==='N')directional.y=numeric;
      else if(key==='S')directional.y=-numeric;
      else if(key==='U'||key==='EL')directional.z=numeric;
      else if(key==='D')directional.z=-numeric;
      return '';
    });
  if([directional.x,directional.y,directional.z].every(Number.isFinite))return directional;
  const values=source.match(/-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?/g)?.map(Number)||[];
  return values.length>=3&&values.slice(0,3).every(Number.isFinite)
    ? {x:values[0],y:values[1],z:values[2]}:null;
}
/**
 * The shipping point extractor can infer a point from three numbers anywhere
 * in a description. Reject correlated false coordinate interpretations at
 * the independent source boundary; leave shipping geometry unchanged.
 * Position/POS are explicit coordinate fields; DTXR_POS may be descriptive.
 */
const coordinateNumber='[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[Ee][+-]?\\d+)?';
const coordinateSeparator='(?:\\s+|\\s*[,;]\\s*)';
const plainCoordinates=new RegExp('^\\s*('+coordinateNumber+')'+
  coordinateSeparator+'('+coordinateNumber+')'+coordinateSeparator+
  '('+coordinateNumber+')\\s*$');
const labeledCoordinates=new RegExp('(EL|E|W|N|S|U|D)\\s*[:=]?\\s*('+
  coordinateNumber+')','gi');
function strictCoordinatePoint(value){
  const source=trim(value);
  if(!source)return null;
  const plain=source.match(plainCoordinates);
  if(plain){
    const [x,y,z]=plain.slice(1).map(Number);
    return [x,y,z].every(Number.isFinite)?{x,y,z}:null;
  }
  const axes={},seen=new Set();
  let cursor=0,count=0;
  for(const match of source.matchAll(labeledCoordinates)){
    if(!/^[\s,;]*$/.test(source.slice(cursor,match.index)))return null;
    const value=Number(match[2]),direction=match[1].toUpperCase();
    const axis=direction==='E'||direction==='W'?'x':
      direction==='N'||direction==='S'?'y':'z';
    if(!Number.isFinite(value)||seen.has(axis))return null;
    seen.add(axis);
    axes[axis]=['W','S','D'].includes(direction)?-value:value;
    count++;
    cursor=match.index+match[0].length;
  }
  if(count!==3||!/^[\s,;]*$/.test(source.slice(cursor))||
     !['x','y','z'].every(axis=>seen.has(axis)))return null;
  return axes;
}
function attestCoordinateValue(raw,kind,index,required){
  if(!trim(raw))return null;
  const precise=strictCoordinatePoint(raw);
  const legacy=point(raw);
  if(!precise){
    if(required||legacy)
      invalid('ambiguous coordinate at XML occurrence '+index+' field '+kind);
    return null;
  }
  if(!legacy||['x','y','z'].some(axis=>
    Math.abs(precise[axis]-legacy[axis])>1e-9))
    invalid('coordinate differs from Resolver at XML occurrence '+index+' field '+kind);
  return precise;
}
function first(attrs,keys){
  for(const key of keys)if(trim(attrs[key]))return trim(attrs[key]);
  return '';
}
function node(fields,branch,index){
  const directPosition=first(fields,['Position']);
  const pos=directPosition||first(fields,['DTXR_POS','DtxrPos']);
  const number=trim(fields.NodeNumber);
  const p=attestCoordinateValue(pos,directPosition?'Position':'DTXR_POS',
    index,!!directPosition);
  return {xmlIndex:index,tagName:'Node',attrs:{},
    nodeKeys:number?[number]:[],xmlNodeNumber:number,
    xmlNodeName:trim(fields.NodeName),componentType:trim(fields.ComponentType),
    componentRefNo:trim(fields.ComponentRefNo),xmlBranch:branch,branchName:branch,
    xmlPosition:pos,xmlPoint:p,posPoint:p,
    psKey:first(fields,['NodeName','DTXR_PS','DtxrPs','ComponentRefNo'])};
}
function attributeNode(name,attrs,branch,index){
  const keys=['NODE','Node','node','FROM_NODE','TO_NODE','FromNode','ToNode']
    .map(key=>trim(attrs[key])).filter(Boolean);
  const pos=first(attrs,['DTXR_POS','POS','Pos','position','Position']);
  const xyz=attrs.X!==undefined&&attrs.Y!==undefined&&attrs.Z!==undefined
    ?point([attrs.X,attrs.Y,attrs.Z]):null;
  const ps=first(attrs,['DTXR_PS','PS','Ps','supportPs','psNo']);
  if(!keys.length&&!pos&&!xyz&&!ps)return null;
  const directPos=first(attrs,['POS','Pos','position','Position']);
  const strictPos=attestCoordinateValue(pos,directPos?'Position':'DTXR_POS',
    index,!!directPos);
  const hasXyz=['X','Y','Z'].some(key=>Object.hasOwn(attrs,key));
  if(hasXyz&&(!['X','Y','Z'].every(key=>Object.hasOwn(attrs,key))||
       !['X','Y','Z'].every(key=>new RegExp('^'+coordinateNumber+'$')
         .test(trim(attrs[key])))))
    invalid('invalid X/Y/Z attributes at XML occurrence '+index);
  const p=strictPos||xyz;
  const b=first(attrs,['LINE_ID','BRANCH','Branchname','PIPELINE_REF','LINE_NO'])||branch;
  return {xmlIndex:index,tagName:name,attrs,nodeKeys:keys,
    xmlNodeNumber:keys[0]||'',xmlNodeName:ps,
    componentType:first(attrs,['ComponentType','TYPE','Type']),
    componentRefNo:first(attrs,['ComponentRefNo','COMPONENTREFNO','REF']),
    xmlBranch:b,branchName:b,
    xmlPosition:pos||(p?('E='+p.x+' N='+p.y+' EL='+p.z):''),
    xmlPoint:p,posPoint:p,psKey:ps};
}
/** Parse supported XML into source semantics without invoking the legacy parser. */
export function independentXmlSemanticView(xml){
  if(typeof xml!=='string'||!xml)invalid('empty document');
  let i=xml.charCodeAt(0)===0xfeff?1:0,roots=0,lastFlatBranch='';
  const stack=[],nodes=[],attrNodes=[];
  // The original flat <Root><Branchname>...<Node> form uses a sequential
  // root-local label. A <Pipe> or <Branch> is instead an independent scope;
  // never inherit identity from an already-closed sibling container.
  const scopeNames=new Set(['Pipe','Branch']);
  const branch=()=>{
    for(let k=stack.length-1;k>=0;k--)
      if(stack[k].isBranchScope)return stack[k].branch;
    return lastFlatBranch;
  };
  const append=(raw,cdata=false)=>{
    if(!stack.length){if(raw.trim())invalid('text outside root');return;}
    if(!cdata&&raw.includes(']]>'))invalid('bare CDATA terminator');
    const current=stack.at(-1);
    const decoded=cdata?raw:decode(raw);
    if(current.capture)current.text+=decoded;
  };
  const finish=ctx=>{
    const value=trim(ctx.text),parent=stack.at(-1);
    if(parent?.isNode&&nodeKeys.includes(ctx.name)&&ctx.capture){
      if(Object.hasOwn(parent.fields,ctx.name))invalid('duplicate node field');
      parent.fields[ctx.name]=value;
    }
    if(branchKeys.includes(ctx.name)){
      if(!parent||(!parent.isBranchScope&&stack.length!==1))
        invalid('unscoped branch identity field '+ctx.name);
      if(parent.isBranchScope){
        const primary=ctx.name==='Branchname'||ctx.name==='BranchName';
        if(primary){
          if(parent.branchDeclared)
            invalid('duplicate branch identity in '+parent.name+' scope');
          parent.branchDeclared=true;
          parent.branch=value;
        }else{
          // Authentic PipeStressXML includes a terminal LineNo after each
          // Branchname and its Nodes. This is metadata, NOT a second name.
          if(parent.auxBranchFields.has(ctx.name))
            invalid('duplicate branch metadata '+ctx.name);
          parent.auxBranchFields.add(ctx.name);
          if(!parent.branchDeclared){
            parent.branchDeclared=true;
            parent.branch=value; // Flat older scoped formats can use LineNo.
          }
        }
      }else{
        // Root-flat compatibility only. A named inner Pipe/Branch must never
        // escape into this fallback after its closing tag.
        lastFlatBranch=value;
      }
    }
    if(ctx.isNode)nodes.push(node(ctx.fields,ctx.branch,nodes.length+1));
  };
  while(i<xml.length){
    if(xml[i]!=='<'){
      const end=xml.indexOf('<',i);
      append(xml.slice(i,end<0?xml.length:end));
      i=end<0?xml.length:end;continue;
    }
    if(xml.startsWith('<!--',i)){
      const end=xml.indexOf('-->',i+4);
      if(end<0||xml.slice(i+4,end).includes('--'))invalid('comment syntax');
      i=end+3;continue;
    }
    if(xml.startsWith('<![CDATA[',i)){
      const end=xml.indexOf(']]>',i+9);
      if(end<0)invalid('CDATA syntax');
      append(xml.slice(i+9,end),true);i=end+3;continue;
    }
    if(xml.startsWith('<?',i)){
      const end=xml.indexOf('?>',i+2);
      if(end<0)invalid('processing instruction');
      i=end+2;continue;
    }
    if(xml.startsWith('<!',i))invalid('DTD/declaration unsupported');
    if(xml.startsWith('</',i)){
      const end=xml.indexOf('>',i+2);
      if(end<0)invalid('end tag');
      const name=xml.slice(i+2,end).trim();
      if(!namePattern.test(name)||name.match(namePattern)[0]!==name)
        invalid('end-tag name');
      const ctx=stack.pop();
      if(!ctx||ctx.raw!==name)invalid('unbalanced element');
      finish(ctx);i=end+1;continue;
    }
    let end=i+1,quote=null;
    for(;end<xml.length;end++){
      const ch=xml[end];
      if(quote){if(ch===quote)quote=null;}
      else if(ch==='"'||ch==="'")quote=ch;
      else if(ch==='>')break;
    }
    if(end>=xml.length)invalid('open-tag syntax');
    const selfClose=xml[end-1]==='/';
    const {name:raw,attrs}=attributes(xml.slice(i+1,end-(selfClose?1:0)));
    const name=local(raw),parent=stack.at(-1);
    if(parent?.capture)invalid('markup inside scalar field unsupported');
    if(!stack.length&&++roots!==1)invalid('multiple roots');
    const b=branch();
    const isBranchScope=scopeNames.has(name);
    // Every explicit scope starts anonymous until it declares its own name.
    // A root-flat label remains legal only outside such scopes.
    if(name==='Node'&&!b&&
       stack.some(ancestor=>ancestor.isBranchScope))
      invalid('node without branch identity inside Pipe/Branch scope');
    const ctx={raw,name,isNode:name==='Node',isBranchScope,
      branch:isBranchScope?'':b,branchDeclared:false,
      auxBranchFields:isBranchScope?new Set():null,
      fields:{},capture:fieldNames.has(name),text:''};
    if(name!=='Node'){
      const candidate=attributeNode(name,attrs,b,attrNodes.length+1);
      if(candidate){
        if(!candidate.xmlBranch&&
           stack.some(ancestor=>ancestor.isBranchScope))
          invalid('attribute node lacks scoped branch identity');
        attrNodes.push(candidate);
      }
    }
    stack.push(ctx);
    if(selfClose){stack.pop();finish(ctx);}
    i=end+1;
  }
  if(roots!==1||stack.length)invalid('missing/unclosed XML root');
  if(nodes.length&&attrNodes.some(n=>n.tagName==='PIPINGELEMENT'))
    invalid('mixed Node/PIPINGELEMENT');
  const view=nodes.length?nodes:attrNodes;
  if(!view.length)invalid('zero recognizable source nodes');
  return view;
}
function equal(field,i,expected,actual){
  if(expected!==actual)mismatch(field,i,expected,actual);
}
function comparePoint(field,i,a,b){
  if(a===null||b===null){
    if(a!==b)mismatch(field,i,a,b);
    return;
  }
  for(const key of ['x','y','z'])
    if(!Number.isFinite(Number(b?.[key]))||
       Math.abs(Number(a[key])-Number(b[key]))>1e-9)
      mismatch(field+'.'+key,i,a[key],b?.[key]);
}
function expectedPosKey(n){
  if(!n.xmlPoint)return n.xmlPosition;
  const f=v=>String(Math.round(v*1000)/1000);
  return 'E='+f(n.xmlPoint.x)+' N='+f(n.xmlPoint.y)+' EL='+f(n.xmlPoint.z);
}
/** Source-to-index-to-final-ledger equivalence. Call BEFORE any CSV generation. */
export function assertResearchXmlSemanticLedger(xml,ledgerNodes,records){
  const expected=independentXmlSemanticView(xml);
  if(!Array.isArray(ledgerNodes)||!Array.isArray(records)||
     ledgerNodes.length!==expected.length||records.length!==expected.length)
    mismatch('population',0,expected.length,[ledgerNodes?.length,records?.length]);
  for(let i=0;i<expected.length;i++){
    const e=expected[i],idx=i+1,n=ledgerNodes[i],r=records[i];
    if(!n||!r)mismatch('missing occurrence',idx,true,false);
    for(const item of [n,r]){
      for(const key of ['xmlIndex','xmlNodeNumber','xmlNodeName','componentType',
        'componentRefNo','xmlBranch','branchName','xmlPosition'])
        equal(key,idx,e[key],item[key]);
      comparePoint('xmlPoint',idx,e.xmlPoint,item.xmlPoint);
      if(Object.hasOwn(item,'posPoint'))
        comparePoint('posPoint',idx,e.xmlPoint,item.posPoint);
      if(Object.hasOwn(item,'posKey'))
        equal('posKey',idx,expectedPosKey(e),item.posKey);
    }
    equal('tagName',idx,e.tagName,n.tagName);
    if(Object.hasOwn(n,'psKey'))equal('psKey',idx,e.psKey,n.psKey);
    if(Object.hasOwn(r,'nodeNumber'))equal('nodeNumber',idx,e.xmlNodeNumber,r.nodeNumber);
    if(Object.hasOwn(r,'nodeName'))equal('nodeName',idx,e.xmlNodeName,r.nodeName);
    if(!Array.isArray(n.nodeKeys)||
       JSON.stringify(n.nodeKeys)!==JSON.stringify(e.nodeKeys))
      mismatch('nodeKeys',idx,e.nodeKeys,n.nodeKeys);
    if(e.tagName!=='Node'&&JSON.stringify(n.attrs)!==JSON.stringify(e.attrs))
      mismatch('attrs',idx,e.attrs,n.attrs);
  }
  return records;
}
