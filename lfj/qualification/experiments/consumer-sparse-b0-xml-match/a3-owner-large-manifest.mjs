/**
 * Explicit Owner workload metadata contract. This validates DECLARED custody,
 * bytes and SHA values, not external proof of historical Owner authorship.
 * Synthetic or repository-derived fixtures cannot be counted as Owner goldens.
 */
const isHex=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const isPath=x=>typeof x==='string'&&x.trim().length>0;
const err=message=>Object.assign(new Error(message),{code:'LFJ_OWNER_MANIFEST_INVALID'});
const MiB=1024*1024;
export function validateOwnerLargeManifest(m) {
  if(m?.schema!=='LFJ.A3.OwnerLargeQualification.v1' ||
     m.provenanceClass!=='OWNER_SUPPLIED_EXTERNAL' ||
     !isPath(m.ownerEvidenceReference) ||
     !Array.isArray(m.workloads)||m.workloads.length!==2)
    throw err('Owner provenance and exact two-workload manifest are required');
  const ids=m.workloads.map(w=>w.id);
  if(ids[0]!=='owner-30mb'||ids[1]!=='owner-90mb')
    throw err('List owner-30mb then distinct owner-90mb');
  const files=new Set(),hashes=new Set();
  for(const w of m.workloads){
    if(!isPath(w.sourcePath)||!isPath(w.xmlPath)||
       !isHex(w.sourceSha256)||!isHex(w.xmlSha256)||
       !Number.isSafeInteger(w.sourceBytes)||w.sourceBytes<=0 ||
       !isPath(w.sourceEvidenceReference))
      throw err('Every workload requires exact source/XML paths, SHA, size and custody');
    if(files.has(w.sourcePath)||hashes.has(w.sourceSha256))
      throw err('30MB and 90MB must be different original sources');
    files.add(w.sourcePath);hashes.add(w.sourceSha256);
  }
  const [small,large]=m.workloads;
  if(small.sourceBytes<25*MiB||small.sourceBytes>32*MiB ||
     small.expectedOutcome!=='INDEXED_TWO_CSV' ||
     !Number.isSafeInteger(small.expectedXmlNodes)||
     small.expectedXmlNodes<1||
     !Number.isSafeInteger(small.expectedMatchedNodes)||
     small.expectedMatchedNodes<0||
     small.expectedMatchedNodes>small.expectedXmlNodes||
     !isHex(small.expectedNodeWiseCsvSha256)||
     !isHex(small.expectedEvidenceTreeCsvSha256))
    throw err('Owner 30 MB needs genuine in-cap size and independently attested two CSV goldens');
  if(large.sourceBytes<80*MiB||large.sourceBytes>100*MiB ||
     large.expectedOutcome!=='REJECT_CURRENT_32MIB_LIMIT')
    throw err('Distinct Owner 90 MB is a capacity/rejection test, not accepted processing');
  return Object.freeze({
    schema:m.schema,provenanceClass:m.provenanceClass,
    ownerEvidenceReference:m.ownerEvidenceReference,
    workloads:Object.freeze(m.workloads.map(w=>Object.freeze({...w})))
  });
}
