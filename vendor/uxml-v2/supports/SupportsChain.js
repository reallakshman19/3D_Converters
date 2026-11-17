// The supports chain on the real ports: restraint core (batch 1), ledger and config (batch 2), sub-steps 1-4.
// No recorded replay anywhere. The ports that take the core as a trailing argument are bound to the real core here.
import * as coreFns from './core/index.js';
import * as ledger from './ledger/index.js';
import * as config from './config/EnrichmentConfig.js';
import { parentSupportLoop as parentPort } from './parent/ParentSupportLoop.js';
import { enrichStandaloneDtxrAnnotations as dtxrPort } from './dtxr/index.js';
import * as closures from './closures/index.js';

const functionsOf = (m) => Object.fromEntries(Object.entries(m).filter(([, f]) => typeof f === 'function'));

export function createRealCore() {
  const real = { ...functionsOf(coreFns), ...functionsOf(ledger), ...functionsOf(config) };
  real.decorateJsonTraceMember = (member, cfg) => ledger.decorateJsonTraceMember(member, cfg, real);
  real.decorateJsonTraceLedger = (rows, cfg) => ledger.decorateJsonTraceLedger(rows, cfg, real);
  real.migrateXmlCiiSupportConfigJson = (json) => config.migrateXmlCiiSupportConfigJson(json, real);
  real.parseXmlCiiEnrichmentConfig = (json) => config.parseXmlCiiEnrichmentConfig(json, real);
  return real;
}

const REAL = createRealCore();

// Same signatures as the sub-step gate expects; a trailing core passed by a caller is ignored (the real one is used).
export const parentSupportLoop = (input) => parentPort(input, REAL);
export const enrichStandaloneDtxrAnnotations = (xmlText, staged, cfg) => dtxrPort(xmlText, staged, cfg, REAL);
export const closeGovernedAttaDefaultRestraintsXml = (xmlText, cfg) => closures.closeGovernedAttaDefaultRestraintsXml(xmlText, cfg, REAL);
export const closeGovernedMdsPositionRestraintsXml = (xmlText, staged, cfg) => closures.closeGovernedMdsPositionRestraintsXml(xmlText, staged, cfg, REAL);
