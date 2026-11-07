import assert from 'node:assert/strict';
import test from 'node:test';
import {reconcileXml229ActualCiiAgainstFinal} from
  '../converters/xml-cii2019-core/xml229-native-cii-independent-reconciliation.mjs';

test('S1 test-only packet cannot become an independently authorized Native Final CII',async()=>{
  await assert.rejects(
    reconcileXml229ActualCiiAgainstFinal({
      originalXmlText:'<PipeStressExport/>',
      packet:{s1TestOnlyNonrelease:true},
      ciiText:'#$ CONTROL\n0 0 0 0 0 0\n',
      writerDiagnostic:{nativeCiiReleaseAuthorized:true},
    }),
    error=>error?.code==='NATIVE_S1_TEST_ONLY_PACKET_RELEASE_FORBIDDEN',
  );
});
