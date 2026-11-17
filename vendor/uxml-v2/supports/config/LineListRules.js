export const FIELD_RULES = {
  lineSeqNo: {
    all: [
      ['line number', 'line no', 'line no.', 'lineno', 'line', 'seq', 'sequence', 'no.']
    ],
    reject: [
      /(piping|construction|pipe)\s*class/i,
      /\bspec\b/i,
      /rating/i,
      /material/i,
      /pressure/i,
      /temp/i,
      /density/i,
      /fluid/i
    ]
  },

  lineKey1: {
    all: [
      ['service', 'fluid']
    ],
    reject: [
      /piping\s*class/i,
      /pipe\s*class/i,
      /line\s*(number|no\.?)/i,
      /rating/i,
      /pressure/i,
      /temp/i,
      /density/i
    ]
  },

  lineKey2: {
    all: [
      ['line number', 'line no', 'line no.', 'lineno', 'line', 'seq', 'sequence']
    ],
    reject: [
      /(piping|construction|pipe)\s*class/i,
      /\bspec\b/i,
      /rating/i,
      /material/i,
      /pressure/i,
      /temp/i,
      /density/i,
      /fluid/i,
      /critical/i,
      /stress/i,
      /\bempty\b/i
    ],
    requireHeaderMatch: true
  },

  pipingClass: {
    all: [
      ['piping', 'pipe'],
      ['class', 'spec']
    ],
    reject: [
      /construction\s*class/i,
      /\bconstruction\b/i,
      /line\s*(number|no\.?)/i,
      /\bservice\b/i,
      /\bfluid\b/i,
      /rating/i,
      /material/i,
      /pressure/i,
      /temp/i,
      /density/i,
      /insulation/i
    ]
  },

  rating: {
    all: [
      ['rating']
    ],
    reject: [
      /piping\s*class/i,
      /pipe\s*class/i,
      /material/i,
      /pressure/i,
      /temp/i,
      /density/i,
      /line/i
    ]
  },

  material: {
    all: [
      ['material', 'mat', 'moc']
    ],
    reject: [
      /material\s*code/i,
      /mat\.?\s*code/i,
      /\bcode\b/i,
      /piping\s*class/i,
      /pipe\s*class/i,
      /construction\s*class/i,
      /insulation\s*material/i,
      /insulation/i,
      /rating/i,
      /pressure/i,
      /temp/i,
      /density/i
    ]
  },

  convertedBore: {
    all: [
      ['bore', 'size', 'dn', 'nb', 'nps', 'nominal pipe', 'nominal bore']
    ],
    reject: [
      /class/i,
      /spec/i,
      /rating/i,
      /pressure/i,
      /temp/i,
      /density/i,
      /line/i
    ]
  },

  p1: {
    all: [
      ['p1', 'pressure', 'pr'],
      ['p1', 'max', 'design']
    ],
    reject: [
      /test\s*pressure/i,
      /hydro/i,
      /hydrostatic/i,
      /proof/i,
      /temp/i,
      /temperature/i,
      /density/i,
      /fluid/i,
      /line\s*(number|no\.?)/i,
      /piping\s*class/i
    ]
  },

  t1: {
    all: [
      ['t1', 'temp', 'temperature'],
      ['t1', 'max', 'design']
    ],
    reject: [
      /min/i,
      /pressure/i,
      /test/i,
      /hydro/i,
      /density/i
    ]
  },

  t2: {
    all: [
      ['t2', 'temp', 'temperature']
    ],
    optional: [
      ['normal', 'operating']
    ],
    reject: [
      /max/i,
      /min/i,
      /pressure/i,
      /test/i,
      /hydro/i,
      /density/i
    ]
  },

  t3: {
    all: [
      ['t3', 'temp', 'temperature'],
      ['t3', 'min']
    ],
    reject: [
      /max/i,
      /pressure/i,
      /test/i,
      /hydro/i,
      /density/i
    ]
  },

  hydroPressure: {
    all: [
      ['pressure', 'pr'],
      ['hydo', 'hydro', 'test']
    ],
    reject: [
      /temp/i,
      /temperature/i,
      /density/i,
      /line\s*(number|no\.?)/i,
      /piping\s*class/i
    ]
  },

  insThk: {
    all: [
      ['insulation', 'ins'],
      ['thickness', 'thk']
    ],
    reject: [
      /insulation\s*type/i
    ]
  },

  density: {
    all: [
      ['density', 'den', 'kg/m', 'kg/m3', 'kg/cm', 'kg/cm3', 'kg']
    ],
    reject: [
      /mixed/i,
      /gas/i,
      /liquid/i,
      /\bliq\b/i,
      /phase/i,
      /pressure/i,
      /temp/i
    ]
  },

  densityMixed: {
    all: [
      ['mixed'],
      ['density', 'den', 'kg/m', 'kg/m3', 'kg/cm', 'kg/cm3', 'kg']
    ],
    reject: [
      /gas/i,
      /liquid/i,
      /\bliq\b/i
    ]
  },

  densityGas: {
    all: [
      ['gas'],
      ['density', 'den', 'kg/m', 'kg/m3', 'kg/cm', 'kg/cm3', 'kg']
    ],
    reject: [
      /mixed/i,
      /liquid/i,
      /\bliq\b/i
    ]
  },

  densityLiquid: {
    all: [
      ['liquid', 'liq'],
      ['density', 'den', 'kg/m', 'kg/m3', 'kg/cm', 'kg/cm3', 'kg']
    ],
    reject: [
      /mixed/i,
      /gas/i
    ]
  },

  phase: {
    all: [
      ['fluid', 'phase', 'medium']
    ],
    reject: []
  }
};

export const DETECTION_ORDER = [
  'lineKey1',
  'lineKey2',
  'pipingClass',
  'rating',
  'material',
  'convertedBore',
  'p1',
  't1',
  't2',
  't3',
  'hydroPressure',
  'insThk',
  'density',
  'densityMixed',
  'densityGas',
  'densityLiquid',
  'phase'
];

