export const DEFAULT_XML_CII_2019_SUPPORT_CONFIG = Object.freeze({
  schema: 'xml-cii-2019-standalone-support-config/v1',
  splitCondensedValveFlange: false,
  useFrictionSentinelForNonYSupports: true,
  disableCiiSupportTagPopulation: true,
  convertDensityKgM3ToKgCm3: true,
  defaultStiffness: 1751270000000,
  defaultGap: 0,
  defaultFriction: 0.3,
  defaultTeeSifType: 0,
});

export function defaultXmlCii2019SupportConfigJson() {
  return JSON.stringify(DEFAULT_XML_CII_2019_SUPPORT_CONFIG, null, 2);
}
