/** Authored test Worker importing the reusable P3B.2A source-only projection.
 * No Preview calculation authority, rating, Weight or native CII output.
 */
import {projectXml229SelectedPreviewSource} from '../../tabs/xml-cii-2019-standalone/integration/xml229-preview-source-projection.mjs';
self.onmessage=async({data:m})=>{
  try{
    if(m?.kind!=='P3B2A_TEST_PROJECT')throw Error('P3B2A_TEST_REQUEST');
    const result=await projectXml229SelectedPreviewSource({
      manifest:m.manifest,values:m.values,config:m.config,
    });
    self.postMessage({kind:'P3B2A_TEST_SUCCESS',result});
  }catch(e){self.postMessage({kind:'P3B2A_TEST_FAILED',code:e?.code||String(e?.message||e)});}
};
