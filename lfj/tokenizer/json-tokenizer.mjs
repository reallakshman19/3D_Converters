/**
 * LFJ R04/U01 incremental byte cursor and bounded JSON string tokenizer.
 * No JSON.parse, no full-document or fake AST array, no engineering rights.
 * U02 complete Unicode, U03 full document grammar, U04 global budgets remain
 * independently rejectable future work; don't interpret this as JSON-valid.
 */
export class JsonTokenError extends SyntaxError {
  constructor(code,offset,detail){
    super(code+' at original byte '+offset+': '+detail);
    this.name='JsonTokenError';this.code=code;this.byteOffset=offset;
  }
}
const fail=(code,offset,detail)=>{throw new JsonTokenError(code,offset,detail);};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
const MAX_PAGE=1024*1024;

/** Cursor fetches only one bounded original-byte page at a time. */
export function createJsonByteCursor(snapshot,{
  startByte=0,pageBytes=65536,signal=null,
}={}) {
  if(!snapshot||!safe(snapshot.byteLength)||typeof snapshot.revision!=='string'
      ||!snapshot.revision||typeof snapshot.sha256!=='string'
      ||typeof snapshot.readRange!=='function')
    fail('INVALID_BYTE_SOURCE',0,'R03 byte snapshot required');
  if(!safe(startByte)||startByte>snapshot.byteLength)
    fail('INVALID_START',0,'start byte is outside original source');
  if(!safe(pageBytes)||pageBytes===0||pageBytes>MAX_PAGE)
    fail('PAGE_LIMIT',startByte,'page budget must be 1..1MiB');
  let offset=startByte,pageStart=startByte,page=new Uint8Array(0);
  function checkAbort(){
    if(signal?.aborted)fail('SCAN_ABORTED',offset,'source scan was cancelled');
  }
  async function ensure() {
    checkAbort();
    if(offset>=snapshot.byteLength)return false;
    if(offset<pageStart||offset>=pageStart+page.length){
      const end=Math.min(snapshot.byteLength,offset+pageBytes);
      const read=await snapshot.readRange(offset,end,snapshot.revision);
      checkAbort();
      if(!(read instanceof Uint8Array)||read.length!==end-offset)
        fail('INVALID_BYTE_SOURCE',offset,'R03 returned an invalid original-byte range');
      pageStart=offset;page=read;
    }
    return true;
  }
  return Object.freeze({
    sourceSha256:snapshot.sha256,sourceRevision:snapshot.revision,
    byteLength:snapshot.byteLength,
    get position(){return offset;},
    async peek(){if(!await ensure())return null;return page[offset-pageStart];},
    async take(){
      if(!await ensure())return null;
      const value=page[offset-pageStart];offset++;return value;
    },
  });
}

const utf8=new TextDecoder('utf-8',{fatal:true});
const singleEscapes=Object.freeze({
  34:'"',92:'\\',47:'/',98:'\b',102:'\f',110:'\n',114:'\r',116:'\t',
});
function hexDigit(c){
  if(c>=48&&c<=57)return c-48;
  if(c>=65&&c<=70)return c-55;
  if(c>=97&&c<=102)return c-87;
  return -1;
}

/**
 * Scan exactly one quoted JSON token at the cursor's current original-byte offset.
 * All split source/read chunks preserve the same result and half-open byte span.
 */
export async function scanQuotedJsonString(cursor,{maxTokenBytes=65536}={}) {
  if(!cursor||typeof cursor.peek!=='function'||typeof cursor.take!=='function'
    ||!safe(cursor.position))fail('INVALID_CURSOR',0,'byte cursor required');
  if(!safe(maxTokenBytes)||maxTokenBytes===0||maxTokenBytes>MAX_PAGE)
    fail('TOKEN_LIMIT',cursor.position,'token bytes must be in 1..1MiB');
  const start=cursor.position;
  const take=async()=>{
    if(cursor.position-start>=maxTokenBytes)
      fail('TOKEN_LIMIT',cursor.position,'quoted scalar exceeded byte cap');
    return cursor.take();
  };
  if(await cursor.peek()!==34)fail('EXPECTED_QUOTE',start,'quoted token must start with double quote');
  await take();
  const out=[],raw=[];
  function flush(){
    if(raw.length===0)return;
    try {out.push(utf8.decode(Uint8Array.from(raw)));}
    catch {fail('INVALID_UTF8',cursor.position,'malformed or truncated UTF8 in scalar');}
    raw.length=0;
  }
  async function readHex(){
    let cp=0;
    for(let i=0;i<4;i++){
      const c=await take();
      const h=hexDigit(c);
      if(c===null||h<0)
        fail('INVALID_UNICODE_ESCAPE',cursor.position,'\\u requires four hexadecimal digits');
      cp=(cp<<4)|h;
    }
    return cp;
  }
  while(true){
    const byte=await cursor.peek();
    if(byte===null)fail('UNTERMINATED_STRING',cursor.position,'quoted scalar has no terminating quote');
    if(byte===34){
      flush();await take();
      return Object.freeze({
        type:'string',startByte:start,endByteExclusive:cursor.position,
        value:out.join(''),sourceSha256:cursor.sourceSha256,
        sourceRevision:cursor.sourceRevision,
      });
    }
    if(byte===92){
      flush();await take();
      const escaped=await take();
      if(escaped===null)fail('UNTERMINATED_STRING',cursor.position,'escape has no next byte');
      if(escaped===117){
        let high=await readHex();
        if(high>=0xD800&&high<=0xDBFF){
          if(await take()!==92||await take()!==117)
            fail('INVALID_SURROGATE',cursor.position,'high surrogate requires low \\u escape');
          const low=await readHex();
          if(low<0xDC00||low>0xDFFF)
            fail('INVALID_SURROGATE',cursor.position,'invalid low surrogate');
          high=0x10000+((high-0xD800)<<10)+(low-0xDC00);
        } else if(high>=0xDC00&&high<=0xDFFF){
          fail('INVALID_SURROGATE',cursor.position,'isolated low surrogate');
        }
        out.push(String.fromCodePoint(high));
      } else {
        if(!Object.hasOwn(singleEscapes,escaped))
          fail('INVALID_ESCAPE',cursor.position,'unsupported JSON string escape');
        out.push(singleEscapes[escaped]);
      }
      continue;
    }
    if(byte<32)fail('UNESCAPED_CONTROL',cursor.position,'raw JSON string control byte');
    raw.push(await take());
  }
}
