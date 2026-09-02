import { createFlangeMasterStore } from './master-store.js';

/**
 * Flange master records transcribed from the committed source workbook.
 *
 * These are TRANSCRIBED / ENGINEERING_SANDBOX records, which is the ceiling the
 * v1 store allows. They exist so the console can offer governed lookups instead
 * of free-typed numbers; they are not design authority and the store rejects any
 * attempt to declare them so.
 *
 * Deliberately absent: the workbook's own `G` column. That column is the mean
 * gasket contact diameter, not an Appendix 2 effective-seating-width derivation,
 * so storing it would freeze one particular basis into what looks like governed
 * geometry. Gasket contact diameters are stored instead and `G` is derived at
 * use, by `./ug44-input-resolution.js`.
 */

const SOURCE_ID = 'FLANGE_RATING_VS_NOZZLE_LOADS_REV3';

const SOURCES = [
  {
    recordId: 'source/flange-rating-vs-nozzle-loads-rev3',
    sourceId: SOURCE_ID,
    recordState: 'TRANSCRIBED',
    useAuthority: 'ENGINEERING_SANDBOX',
    path: 'docs/flange/Flange Rating Vs Nozzle loads -Rev.3.xlsx',
    sha256: 'd664bad746f39479a09ee9f126c39dd858822dfcb575f45d0a09152fa89e3b66',
    sheets: ['#150', '#300', '#600', '#900', 'Sheet1'],
    note: 'Owner-supplied project workbook. Hash-pinned by the bolted-joint source archive.',
  },
];

/**
 * Pressure rating by class. The workbook states one value per class with no
 * temperature and no material group, so neither can be recorded here. Both stay
 * null and are listed as unresolved rather than guessed: a pressure-temperature
 * rating without its temperature is not a governed rating.
 */
const RATING_BY_CLASS = [
  [150, 1770],
  [300, 4660],
  [600, 9320],
  [900, 13980],
];

/** [nominalSizeIn, pressureClass, gasketInnerDiameterMm, gasketOuterDiameterMm, momentFactor] */
const ROWS = [
  [2, 150, 69.9, 85.9, 1.2],
  [3, 150, 101.6, 120.7, 1.2],
  [4, 150, 127, 149.4, 1.2],
  [6, 150, 182.6, 209.6, 1.2],
  [8, 150, 233.4, 263.7, 1.2],
  [10, 150, 287.3, 317.5, 1.2],
  [12, 150, 339.9, 374.7, 1.2],
  [14, 150, 371.6, 406.4, 1.2],
  [16, 150, 422.4, 463.6, 1.2],
  [18, 150, 474.7, 527.1, 1.2],
  [20, 150, 525.5, 577.9, 1.2],
  [24, 150, 628.7, 685.8, 1.2],
  [26, 150, 673.1, 704.9, 0.6],
  [28, 150, 723.9, 755.7, 0.6],
  [30, 150, 774.7, 806.5, 0.6],
  [32, 150, 825.5, 860.6, 0.6],
  [34, 150, 876.3, 911.4, 0.6],
  [36, 150, 927.1, 968.5, 0.6],
  [38, 150, 977.9, 1019.3, 0.6],
  [40, 150, 1028.7, 1070.1, 0.6],
  [48, 150, 1231.9, 1279.7, 0.6],
  [2, 300, 69.9, 85.9, 0.5],
  [3, 300, 101.6, 120.7, 0.5],
  [4, 300, 127, 149.4, 0.5],
  [6, 300, 182.6, 209.6, 0.5],
  [8, 300, 233.4, 263.7, 0.5],
  [10, 300, 287.3, 317.5, 0.5],
  [12, 300, 339.9, 374.7, 0.5],
  [14, 300, 371.6, 406.4, 0.5],
  [16, 300, 422.4, 463.6, 0.5],
  [18, 300, 474.7, 527.1, 0.5],
  [20, 300, 525.5, 577.9, 0.5],
  [24, 300, 628.7, 685.8, 0.5],
  [26, 300, 685.8, 736.6, 0.1],
  [28, 300, 736.6, 787.4, 0.1],
  [30, 300, 793.8, 844.6, 0.1],
  [32, 300, 850.9, 901.7, 0.1],
  [34, 300, 901.7, 952.5, 0.1],
  [36, 300, 955.8, 1006.6, 0.1],
  [38, 300, 977.9, 1016, 0.1],
  [40, 300, 1022.4, 1070.1, 0.1],
  [48, 300, 1235.2, 1286, 0.1],
  [2, 600, 69.9, 85.9, 0.5],
  [3, 600, 101.6, 120.7, 0.5],
  [4, 600, 120.7, 149.4, 0.5],
  [6, 600, 174.8, 209.6, 0.5],
  [8, 600, 225.6, 263.7, 0.5],
  [10, 600, 274.6, 317.5, 0.5],
  [12, 600, 327.2, 374.7, 0.5],
  [14, 600, 362, 406.4, 0.5],
  [16, 600, 412.8, 463.6, 0.5],
  [18, 600, 469.9, 527.1, 0.5],
  [20, 600, 520.7, 577.9, 0.5],
  [24, 600, 628.7, 685.8, 0.5],
  [26, 600, 685.8, 736.6, 0.1],
  [28, 600, 736.6, 787.4, 0.1],
  [30, 600, 793.8, 844.6, 0.1],
  [32, 600, 850.9, 901.7, 0.1],
  [34, 600, 901.7, 952.5, 0.1],
  [36, 600, 955.8, 1006.6, 0.1],
  [38, 600, 977.9, 1041.4, 0.1],
  [40, 600, 1022.4, 1098.6, 0.1],
  [48, 600, 1235.2, 1320.8, 0.1],
  [2, 900, 58.7, 85.9, 0.5],
  [3, 900, 95.3, 120.7, 0.5],
  [4, 900, 120.7, 149.4, 0.5],
  [6, 900, 174.8, 209.6, 0.5],
  [8, 900, 222.3, 257.3, 0.5],
  [10, 900, 276.4, 311.2, 0.5],
  [12, 900, 323.9, 368.3, 0.5],
  [14, 900, 355.6, 400.1, 0.3],
  [16, 900, 412.8, 457.2, 0.3],
  [18, 900, 463.6, 520.7, 0.3],
  [20, 900, 520.7, 571.5, 0.3],
  [24, 900, 628.7, 679.5, 0.3],
  [26, 900, 685.8, 736.6, 0.1],
  [28, 900, 736.6, 787.4, 0.1],
  [30, 900, 793.8, 844.6, 0.1],
  [32, 900, 850.9, 901.7, 0.1],
  [34, 900, 901.7, 952.5, 0.1],
  [36, 900, 958.9, 1009.7, 0.1],
  [38, 900, 1035.1, 1085.9, 0.1],
  [40, 900, 1098.6, 1149.4, 0.1],
  [48, 900, 1320.8, 1371.6, 0.1],];

const UNRESOLVED = Object.freeze([
  'Pressure rating temperature is not stated in the source; ratings are recorded without one.',
  'Pressure rating material group is not stated in the source.',
  'The governing B16.5 / B16.47 edition is not stated in the source.',
  'Moment factors are transcribed as tabulated; their governing revision is not stated.',
]);

function ratingRecords() {
  return RATING_BY_CLASS.map(([pressureClass, ratedPressureKPa]) => ({
    recordId: `flange-rating/class-${pressureClass}`,
    sourceId: SOURCE_ID,
    recordState: 'TRANSCRIBED',
    useAuthority: 'ENGINEERING_SANDBOX',
    pressureClass,
    ratedPressureKPa,
    pressureRatingPa: ratedPressureKPa * 1000,
    temperatureC: null,
    materialGroup: null,
    standard: null,
    standardEdition: null,
    sizeIndependentInSource: true,
  }));
}

function momentFactorRecords() {
  return ROWS.map(([nominalSizeIn, pressureClass, , , momentFactor]) => ({
    recordId: `moment-factor/${nominalSizeIn}in-class-${pressureClass}`,
    sourceId: SOURCE_ID,
    recordState: 'TRANSCRIBED',
    useAuthority: 'ENGINEERING_SANDBOX',
    nominalSizeIn,
    pressureClass,
    momentFactor,
  }));
}

function gasketGeometryRecords() {
  return ROWS.map(([nominalSizeIn, pressureClass, innerDiameterMm, outerDiameterMm]) => ({
    recordId: `gasket-geometry/${nominalSizeIn}in-class-${pressureClass}`,
    sourceId: SOURCE_ID,
    recordState: 'TRANSCRIBED',
    useAuthority: 'ENGINEERING_SANDBOX',
    nominalSizeIn,
    pressureClass,
    innerDiameterMm,
    outerDiameterMm,
    // No gasketReactionDiameter: G is derived at use, not stored.
    reactionDiameterBasis: 'DERIVE_AT_USE',
  }));
}

export function buildFlangeMasterStore() {
  return createFlangeMasterStore({
    metadata: {
      datasetId: 'flange-master-dataset/v1',
      transcribedFrom: SOURCE_ID,
      unresolved: UNRESOLVED,
      note: 'Transcription of a project workbook, not governed master data.',
    },
    collections: {
      sources: SOURCES,
      flangeRatings: ratingRecords(),
      momentFactors: momentFactorRecords(),
      gasketGeometries: gasketGeometryRecords(),
    },
  });
}

export { SOURCE_ID as FLANGE_MASTER_DATASET_SOURCE_ID, UNRESOLVED as FLANGE_MASTER_DATASET_UNRESOLVED };
