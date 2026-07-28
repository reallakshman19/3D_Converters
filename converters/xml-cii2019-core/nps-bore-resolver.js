const NPS_TO_BORE_MM = Object.freeze({
  '0.5': 15, '0.75': 20, '1': 25, '1.25': 32, '1.5': 40,
  '2': 50, '2.5': 65, '3': 80, '3.5': 90, '4': 100,
  '5': 125, '6': 150, '8': 200, '10': 250, '12': 300,
  '14': 350, '16': 400, '18': 450, '20': 500, '22': 550,
  '24': 600, '26': 650, '28': 700, '30': 750, '32': 800,
  '34': 850, '36': 900, '38': 950, '40': 1000, '42': 1050,
  '44': 1100, '46': 1150, '48': 1200, '52': 1300, '56': 1400,
  '60': 1500, '64': 1600, '66': 1650, '68': 1700, '72': 1800,
  '76': 1900, '80': 2000,
});

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function finite(value) {
  const match = text(value).replace(/,/g, '').match(/[-+]?\d*\.?\d+/);
  const numeric = match ? Number(match[0]) : NaN;
  return Number.isFinite(numeric) ? numeric : null;
}

function parseFraction(source) {
  const mixed = source.match(/^(\d+)\s*(?:-|\s)\s*(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const numerator = Number(mixed[2]);
    const denominator = Number(mixed[3]);
    return denominator > 0 && numerator < denominator ? whole + numerator / denominator : null;
  }
  const fraction = source.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!fraction) return null;
  const numerator = Number(fraction[1]);
  const denominator = Number(fraction[2]);
  return denominator > 0 ? numerator / denominator : null;
}

export function parseXmlCiiNps(value) {
  const source = text(value)
    .toLowerCase()
    .replace(/(?:nps|inch(?:es)?|in\.?)/g, '')
    .replace(/["”]/g, '')
    .trim();
  if (!source) return null;
  const fraction = parseFraction(source);
  if (fraction != null) return fraction;
  const numeric = Number(source);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

export function resolveXmlCiiBoreMmFromNps(value) {
  const nps = parseXmlCiiNps(value);
  if (nps == null) return null;
  return NPS_TO_BORE_MM[String(Number(nps))] ?? null;
}

export function readXmlCiiExplicitBoreMm(row = {}) {
  for (const key of ['convertedBore', 'Converted Bore', 'Bore (mm)', 'Bore mm', 'BORE_MM', 'boreMm', 'DN', 'NB']) {
    const numeric = finite(row?.[key]);
    if (numeric != null && numeric > 0) return numeric;
  }
  return null;
}

export function readXmlCiiPipingClassNps(row = {}) {
  for (const key of ['nps', 'NPS', 'NPS (in)', 'Size (NPS)', 'Nominal Pipe Size', 'Nominal Size', 'Size']) {
    const raw = text(row?.[key]);
    if (raw) return raw;
  }
  return '';
}

export function normalizeXmlCiiPipingClassMasterRow(row = {}) {
  const source = row && typeof row === 'object' ? row : {};
  const explicitBore = readXmlCiiExplicitBoreMm(source);
  const nps = readXmlCiiPipingClassNps(source);
  const derivedBore = explicitBore ?? resolveXmlCiiBoreMmFromNps(nps);
  return {
    ...source,
    nps: text(source.nps || nps),
    convertedBore: derivedBore ?? '',
    boreMm: derivedBore ?? '',
    boreSource: explicitBore != null ? 'master-bore-mm' : (derivedBore != null ? 'nps-master-table' : 'unresolved'),
  };
}

export function xmlCiiNpsBoreEntries() {
  return Object.entries(NPS_TO_BORE_MM).map(([nps, boreMm]) => ({ nps: Number(nps), boreMm }));
}
