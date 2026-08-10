#!/usr/bin/env python3
"""Independent arithmetic oracle for the user-supplied A106 Gr B DN benchmark."""
from __future__ import annotations

import json
import math
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
BENCHMARK = ROOT / 'Benchmarks' / 'B313Thickness' / 'a106-grb-dn-thickness-benchmark.json'
PSI_TO_MPA = 0.006894757293168361
BAR_TO_MPA = 0.1


def main():
    data = json.loads(BENCHMARK.read_text(encoding='utf-8'))
    common = data['sharedInputs']
    p = float(common['designPressure']) * BAR_TO_MPA
    s = float(common['allowableStress']) * PSI_TO_MPA
    e = float(common['qualityFactorE'])
    w = float(common['weldStrengthReductionW'])
    y = float(common['coefficientY'])
    c = float(common['corrosionAllowance'])
    tol = float(common['negativeMillTolerance']['value']) / 100.0
    ps = p / s
    failures = []

    for row in data['rows']:
        d = float(row['outsideDiameterMm'])
        t = p * d / (2.0 * (s * e * w + p * y))
        tm = t + c
        ordered = tm / (1.0 - tol)
        expected = row['expected']
        for key, actual in (
            ('tMm', t),
            ('tmMm', tm),
            ('requiredNominalThicknessMm', ordered),
        ):
            if not math.isclose(actual, float(expected[key]), rel_tol=0.0, abs_tol=1e-12):
                failures.append((row['dn'], key, actual, expected[key]))
        if not math.isclose(ps, float(data['expectedPressureAllowableStressRatio']), rel_tol=0.0, abs_tol=1e-12):
            failures.append((row['dn'], 'P/S', ps, data['expectedPressureAllowableStressRatio']))

    if failures:
        for failure in failures:
            print('FAIL', *failure)
        return 1

    print(f"A106 Gr B DN thickness benchmark passed: {len(data['rows'])}/{len(data['rows'])} rows")
    return 0


if __name__ == '__main__':
    sys.exit(main())
