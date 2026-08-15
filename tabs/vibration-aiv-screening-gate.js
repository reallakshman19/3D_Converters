import { isAivAssumptionAcceptanceCurrent } from './vibration-aiv-assumption-acceptance.js';
import { isAivMasterAcceptanceCurrent } from './vibration-aiv-master-acceptance.js';

export function isAivScreeningReady(state = {}) {
  const counts = state.readinessEnvelope?.readiness?.counts;
  return Boolean(counts
    && Number(counts.readyForQualification) > 0
    && counts.notReady === 0
    && counts.methodGap === 0
    && isAivAssumptionAcceptanceCurrent(state.assumptionResolution, state.assumptionAcceptance)
    && isAivMasterAcceptanceCurrent(state.masterResolution, state.masterAcceptance));
}
