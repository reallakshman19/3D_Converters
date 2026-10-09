/**
 * B0-09 research-only, Worker-safe XML document structural integrity gate.
 * The shipping Resolver's regex-based node discovery is not an XML parser.
 * This conservative subset intentionally REJECTS declarations with a DTD,
 * external entities, or unsupported markup rather than treating partial XML
 * as a successful all-unresolved engineering result. It does not authorize
 * exports or change the product's node/geometry matching semantics.
 */
const fail=(message)=>{
  throw Object.assign(new Error(message),{code:'XML_INPUT_INVALID'});
};
const startName=/[A-Za-z_:]/;
const namePart=/[A-Za-z0-9_.:-]/;
const whitespace=/[\t\r\n ]/;
const predefined=new Set(['amp','lt','gt','apos','quot']);

function validEntities(segment){
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(segment))
    fail('XML contains disallowed control characters');
  for(let i=0;i<segment.length;i++){
    if(segment[i]==='<')fail('Unescaped < in XML content');
    if(segment[i]!=='&')continue;
    const last=segment.indexOf(';',i+1);
    if(last<0||last-i>24)fail('Unterminated/oversize XML entity');
    const name=segment.slice(i+1,last);
    if(name.startsWith('#')){
      const hex=name[1]==='x';
      const digits=name.slice(hex?2:1);
      if(!(hex?/^[0-9a-fA-F]+$/:/^[0-9]+$/).test(digits))
        fail('Malformed XML numeric entity');
      const code=Number.parseInt(digits,hex?16:10);
      if(!Number.isFinite(code)||code===0||code>0x10ffff||
         (code>=0xd800&&code<=0xdfff)||
         (code<32&&![9,10,13].includes(code)))
        fail('Invalid XML numeric entity codepoint');
    }else if(!predefined.has(name))fail('Unknown XML entity without DTD');
    i=last;
  }
}

/**
 * Require exactly one syntactically nested XML root. Linear scan, no DOM,
 * no giant parsed tree and no user-authored external entity declarations.
 * Returns only a primitive census; semantic XML nodes are still resolved by
 * the existing authoritative application functions.
 */
export function assertResearchXmlDocument(xml){
  if(typeof xml!=='string'||xml.length===0)
    fail('Original XML source is empty or not text');
  let i=xml.charCodeAt(0)===0xfeff?1:0;
  const stack=[];
  let rootCount=0,elements=0,xmlDeclaration=false;
  let nodeElements=0,pipingElements=0,nodeEndElements=0;
  const readName=()=>{
    const start=i;
    if(!startName.test(xml[i]||''))fail('Invalid XML element/attribute name');
    i++;
    while(i<xml.length&&namePart.test(xml[i]))i++;
    return xml.slice(start,i);
  };
  const skipWhitespace=()=>{
    const start=i;
    while(i<xml.length&&whitespace.test(xml[i]))i++;
    return i>start;
  };
  while(i<xml.length){
    if(xml[i]!=='<'){
      const end=xml.indexOf('<',i);
      const limit=end<0?xml.length:end;
      const segment=xml.slice(i,limit);
      if(stack.length===0&&segment.trim())
        fail('Non-whitespace content outside XML root');
      if(segment.includes(']]>'))fail('CDATA terminator outside CDATA');
      validEntities(segment);
      i=limit;
      continue;
    }
    i++;
    if(xml.startsWith('!--',i)){
      const end=xml.indexOf('-->',i+3);
      if(end<0)fail('Unterminated XML comment');
      if(xml.slice(i+3,end).includes('--'))fail('Illegal -- inside XML comment');
      i=end+3;
      continue;
    }
    if(xml.startsWith('![CDATA[',i)){
      if(stack.length===0)fail('CDATA outside XML root');
      const end=xml.indexOf(']]>',i+8);
      if(end<0)fail('Unterminated CDATA');
      i=end+3;
      continue;
    }
    if(xml[i]==='?'){
      const end=xml.indexOf('?>',i+1);
      if(end<0)fail('Unterminated XML processing instruction');
      const body=xml.slice(i+1,end);
      const target=body.match(/^([A-Za-z_:][A-Za-z0-9_.:-]*)/);
      if(!target)fail('Invalid processing-instruction target');
      if(target[1].toLowerCase()==='xml'){
        if(xmlDeclaration||rootCount!==0||stack.length!==0)
          fail('Misplaced/duplicate XML declaration');
        xmlDeclaration=true;
      }
      i=end+2;
      continue;
    }
    if(xml[i]==='!')
      fail('Unsupported XML declaration (DTD/external entities not permitted)');
    if(xml[i]==='/'){
      i++;
      const close=readName();
      skipWhitespace();
      if(xml[i]!=='>')fail('Malformed XML end tag');
      i++;
      if(stack.pop()!==close)fail('Mismatched/unbalanced XML end tag');
      if(close.toUpperCase()==='NODE')nodeEndElements++;
      continue;
    }
    const name=readName();
    if(name.toUpperCase()==='NODE')nodeElements++;
    if(name.toUpperCase()==='PIPINGELEMENT')pipingElements++;
    if(stack.length===0&&++rootCount!==1)
      fail('Multiple XML document roots');
    elements++;
    let selfClosing=false;
    const attrs=new Set();
    while(true){
      const hadWhitespace=skipWhitespace();
      if(xml[i]==='>'){i++;break;}
      if(xml[i]==='/'&&xml[i+1]==='>'){
        i+=2;selfClosing=true;break;
      }
      if(!hadWhitespace)fail('XML attributes must be separated by whitespace');
      const attr=readName();
      if(attrs.has(attr))fail('Duplicate XML attribute');
      attrs.add(attr);
      skipWhitespace();
      if(xml[i++]!=='=')fail('XML attribute lacks equals sign');
      skipWhitespace();
      const quote=xml[i++];
      if(quote!=="'"&&quote!=='"')fail('Unquoted XML attribute');
      const last=xml.indexOf(quote,i);
      if(last<0)fail('Unterminated XML attribute');
      validEntities(xml.slice(i,last));
      i=last+1;
    }
    if(!selfClosing)stack.push(name);
  }
  if(rootCount!==1||stack.length!==0)
    fail('Missing XML root or unclosed XML element');
  // The legacy Resolver's regex parser also sees fake tag strings inside
  // comments/CDATA. Refuse such inputs rather than inflate node population.
  const rawNodes=(xml.match(/<Node\b/gi)||[]).length;
  const rawPiping=(xml.match(/<PIPINGELEMENT\b/gi)||[]).length;
  // The shipping Node-block regex also stops on the FIRST literal </Node>.
  // A closing tag embedded in a legitimate comment, CDATA or processing
  // instruction can truncate an otherwise syntactically valid engineering
  // node. Compare regex-visible closes with lexically parsed structural closes.
  // Also reject noncanonical </Node > spacing that the legacy regex skips.
  const rawNodeEnds=(xml.match(/<\\/Node>/gi)||[]).length;
  if(rawNodes!==nodeElements||rawPiping!==pipingElements||
     rawNodeEnds!==nodeEndElements)
    fail('Legacy parser would see phantom/missing XML node boundaries');
  return Object.freeze({rootCount,elementCount:elements,
    nodeElementCount:nodeElements,pipingElementCount:pipingElements});
}
