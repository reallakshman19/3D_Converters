/**
 * Bounded retained metadata for LFJ B0 source-backed projection.
 *
 * The source grammar/tokenizer and source pages are separately bounded.
 * This checks the additional data which stays in JS memory for the WHOLE
 * consumer projection: staged source paths, root descriptors, and the spatial
 * grouping records. Counts/UTF-8 byte totals are NOT JS heap measurements.
 * No matching semantics or digest algorithms are changed.
 */
export const PROJECTION_RETENTION_LIMITS = Object.freeze({
  stagedPaths: 200_000,
  stagedPathUtf8Bytes: 24 * 1024 * 1024,
  rootBranches: 100_000,
  spatialEntries: 200_000,
  spatialEntryUtf8Bytes: 32 * 1024 * 1024
});
const error=(code,message)=>Object.assign(new Error(message),{code});
const validLimit=n=>Number.isSafeInteger(n)&&n>0;
const encoder=new TextEncoder();

export function createProjectionRetentionBudget(limits=PROJECTION_RETENTION_LIMITS) {
  for(const key of Object.keys(PROJECTION_RETENTION_LIMITS)) {
    if(!validLimit(limits?.[key]) ||
       limits[key] > PROJECTION_RETENTION_LIMITS[key])
      throw error('PROJECTION_RETENTION_CONFIG',
        'Retention limit '+key+' must be positive and no larger than the declared product budget');
  }
  const spent={
    stagedPaths:0,stagedPathUtf8Bytes:0,rootBranches:0,
    spatialEntries:0,spatialEntryUtf8Bytes:0
  };
  const charge=(countKey,bytesKey,bytes)=>{
    if(bytes!==undefined && (!Number.isSafeInteger(bytes)||bytes<0))
      throw error('PROJECTION_RETENTION_INPUT','Invalid projection UTF-8 metadata charge');
    if(spent[countKey]+1>limits[countKey] ||
       (bytesKey && spent[bytesKey]+bytes>limits[bytesKey]))
      throw error('PROJECTION_RETENTION_LIMIT',
        'Projection retained metadata exceeded '+countKey+' / '+(bytesKey||'count')+' budget');
    spent[countKey]++;
    if(bytesKey)spent[bytesKey]+=bytes;
  };
  return Object.freeze({
    stagePath(path) {
      if(typeof path!=='string'||path.length===0)
        throw error('PROJECTION_RETENTION_INPUT','Source path is required');
      charge('stagedPaths','stagedPathUtf8Bytes',encoder.encode(path).byteLength);
    },
    rootBranch() { charge('rootBranches',null); },
    spatialEntry(entry) {
      // The retained spatial records are part of the original match facts,
      // but keeping every record in memory needs its own explicit ceiling.
      const encoded=JSON.stringify(entry);
      if(typeof encoded!=='string')
        throw error('PROJECTION_RETENTION_INPUT','Spatial record must serialize');
      charge('spatialEntries','spatialEntryUtf8Bytes',encoder.encode(encoded).byteLength);
    },
    summary() {
      return Object.freeze({...spent,
        limits:Object.freeze({...limits}),schema:'LFJ.A3.ProjectionRetention.v1'});
    }
  });
}
