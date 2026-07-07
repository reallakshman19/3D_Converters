/**
 * InputXML field-name adapter (translator).
 *
 * CAESAR II "Input XML" exports are not perfectly uniform: different CAESAR
 * II versions, hand-edited files, and other authoring tools sometimes spell
 * the same attribute a little differently (e.g. "PRESSURE1" instead of the
 * "PRESSURE_C1" the converter engines hardcode, or "TEMP_EXPC1" instead of
 * "TEMP_EXP_C1"). Rather than teaching every alias to the core Python
 * engines (inputxml_to_cii2019.py, inputxml_to_cii2014.py, ...), this module
 * rewrites known variant attribute names to their canonical spelling before
 * the file ever reaches Python. The engines stay untouched and keep reading
 * a single hardcoded name per field.
 *
 * How to add a new alias: add the variant spelling to the array for its
 * canonical attribute name in INPUTXML_ATTRIBUTE_ALIASES below. No other
 * code changes are required.
 */

// canonical attribute name (what the Python engines read) -> known variant
// spellings seen in the wild (matched case-insensitively).
export const INPUTXML_ATTRIBUTE_ALIASES = Object.freeze({
  // Confirmed real-world mismatch: CAESAR II Input XML benchmark exports use
  // PRESSURE1..PRESSURE9, but inputxml_to_cii2019.py reads PRESSURE_C1..C9.
  PRESSURE_C1: ['PRESSURE1'],
  PRESSURE_C2: ['PRESSURE2'],
  PRESSURE_C3: ['PRESSURE3'],
  PRESSURE_C4: ['PRESSURE4'],
  PRESSURE_C5: ['PRESSURE5'],
  PRESSURE_C6: ['PRESSURE6'],
  PRESSURE_C7: ['PRESSURE7'],
  PRESSURE_C8: ['PRESSURE8'],
  PRESSURE_C9: ['PRESSURE9'],

  // Anticipated spelling drift for the temperature case set (underscore
  // dropped before the case number, e.g. TEMP_EXPC1 -> TEMP_EXP_C1).
  TEMP_EXP_C1: ['TEMP_EXPC1', 'TEMPEXPC1'],
  TEMP_EXP_C2: ['TEMP_EXPC2', 'TEMPEXPC2'],
  TEMP_EXP_C3: ['TEMP_EXPC3', 'TEMPEXPC3'],
  TEMP_EXP_C4: ['TEMP_EXPC4', 'TEMPEXPC4'],
  TEMP_EXP_C5: ['TEMP_EXPC5', 'TEMPEXPC5'],
  TEMP_EXP_C6: ['TEMP_EXPC6', 'TEMPEXPC6'],
  TEMP_EXP_C7: ['TEMP_EXPC7', 'TEMPEXPC7'],
  TEMP_EXP_C8: ['TEMP_EXPC8', 'TEMPEXPC8'],
  TEMP_EXP_C9: ['TEMP_EXPC9', 'TEMPEXPC9'],

  // Common longhand/shorthand variants for other core PIPINGELEMENT fields.
  WALL_THICK: ['WALL_THICKNESS', 'WALLTHICK'],
  INSUL_THICK: ['INSULATION_THICK', 'INSULATION_THICKNESS', 'INSULTHICK'],
  CORR_ALLOW: ['CORROSION_ALLOW', 'CORROSION_ALLOWANCE', 'CORRALLOW'],
  INSUL_DENSITY: ['INSULATION_DENSITY', 'INSULDENSITY'],
  FLUID_DENSITY: ['FLUIDDENSITY'],
  HYDRO_PRESSURE: ['HYDROTEST_PRESSURE', 'HYDROPRESSURE'],
  MATERIAL_NUM: ['MATERIAL_NUMBER', 'MATERIALNUM'],
});

// Converter IDs whose primary input is the CAESAR II "Input XML" dialect
// that the alias map above applies to. Other converters (e.g. the PSI-style
// XML->CII(2019) source XML) use an unrelated schema and must not be touched.
const INPUTXML_DIALECT_CONVERTER_IDS = Object.freeze(
  new Set(['inputxml_to_cii2019', 'inputxml_to_cii', 'inputxml14_to_cii']),
);

export function converterUsesInputXmlDialect(converterId) {
  return INPUTXML_DIALECT_CONVERTER_IDS.has(String(converterId || ''));
}

function buildVariantPatterns() {
  const patterns = [];
  for (const [canonical, variants] of Object.entries(INPUTXML_ATTRIBUTE_ALIASES)) {
    const canonicalPresencePattern = new RegExp(`[\\s<]${canonical}\\s*=`);
    for (const variant of variants) {
      if (variant.toUpperCase() === canonical.toUpperCase()) continue;
      patterns.push({
        canonical,
        variant,
        canonicalPresencePattern,
        variantPattern: new RegExp(`([\\s<])${variant}(\\s*=)`, 'g'),
      });
    }
  }
  return patterns;
}

const VARIANT_PATTERNS = buildVariantPatterns();

/**
 * Rewrites known variant attribute names to their canonical spelling in raw
 * InputXML text. Deliberately text-based (not DOM-based) so it works the
 * same in a browser tab and inside the Web Worker running the Pyodide
 * conversion job, without depending on DOMParser/XMLSerializer being
 * available in that context.
 *
 * Safety: a variant is only renamed when the canonical spelling does not
 * already appear anywhere in the document, so a file that already mixes
 * both spellings (or already uses the canonical one) is left untouched for
 * that field rather than risking a collision.
 */
export function normalizeInputXmlAttributeNames(xmlText) {
  const text = String(xmlText || '');
  if (!text.trim()) return { xmlText: text, renamed: [] };

  let output = text;
  const renamed = [];
  for (const { canonical, variant, canonicalPresencePattern, variantPattern } of VARIANT_PATTERNS) {
    if (canonicalPresencePattern.test(output)) continue;
    variantPattern.lastIndex = 0;
    if (!variantPattern.test(output)) continue;
    variantPattern.lastIndex = 0;
    output = output.replace(variantPattern, `$1${canonical}$2`);
    renamed.push(`${variant} -> ${canonical}`);
  }

  return { xmlText: output, renamed };
}
