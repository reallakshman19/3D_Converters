#!/usr/bin/env python3
"""Independent numerical oracle for the frozen B31.3 benchmark sets.

This file intentionally does not import or execute the production JavaScript.
It validates benchmark arithmetic from recorded inputs. It does not supply ASME
material properties or replace engineering review of the licensed standard text.
"""
from __future__ import annotations

import json
import math
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
BENCHMARK = ROOT / "Benchmarks" / "B313Thickness" / "b313-thickness-benchmarks.json"
RATIO_BENCHMARK = ROOT / "Benchmarks" / "B313Thickness" / "a106-grb-ps-ratio-benchmark.json"

PRESSURE_TO_MPA = {
    "pa": 1e-6,
    "kpa": 1e-3,
    "mpa": 1.0,
    "bar": 0.1,
    "barg": 0.1,
    "psi": 0.006894757293168361,
    "psig": 0.006894757293168361,
    "ksi": 6.894757293168361,
}
LENGTH_TO_MM = {"mm": 1.0, "cm": 10.0, "m": 1000.0, "in": 25.4, "inch": 25.4, "inches": 25.4}


def pressure(value, unit):
    return float(value) * PRESSURE_TO_MPA[str(unit).lower()]


def length(value, unit):
    return float(value) * LENGTH_TO_MM[str(unit).lower()]


def allowance(case, key, default_unit):
    raw = case.get(key, 0)
    if isinstance(raw, dict):
        return length(raw["value"], raw.get("unit", default_unit))
    return length(raw, case.get("allowanceUnit", default_unit))


def calculate(case):
    length_unit = case.get("lengthUnit", "mm")
    p = pressure(case["designPressure"], case.get("pressureUnit", "MPa"))
    d = length(case["outsideDiameter"], length_unit)
    s = pressure(case["allowableStress"], case.get("stressUnit", case.get("pressureUnit", "MPa")))
    e = float(case["qualityFactorE"])
    w = float(case["weldStrengthReductionW"])
    y = float(case["coefficientY"])
    t = p * d / (2.0 * (s * e * w + p * y))
    c = sum(allowance(case, key, length_unit) for key in (
        "corrosionAllowance", "mechanicalAllowance", "erosionAllowance", "otherAllowance"
    ))
    minimum = t + c
    tol = case["negativeMillTolerance"]
    basis = tol["basis"].lower()
    if basis == "percent":
        nominal = minimum / (1.0 - float(tol["value"]) / 100.0)
    elif basis == "absolute":
        nominal = minimum + length(tol["value"], tol["unit"])
    else:
        raise ValueError(f"unsupported tolerance basis {basis}")
    return {
        "pressureDesignThicknessMm": t,
        "requiredMinimumThicknessMm": minimum,
        "requiredNominalThicknessMm": nominal,
        "pressureStressRatio": p / (s * e),
        "thicknessDiameterRatio": t / d,
    }


def main():
    data = json.loads(BENCHMARK.read_text(encoding="utf-8"))
    ratio_data = json.loads(RATIO_BENCHMARK.read_text(encoding="utf-8"))
    mm_tol = float(data["numericTolerance"]["absoluteMm"])
    dim_tol = float(data["numericTolerance"]["dimensionless"])
    failures = []

    for entry in data["cases"]:
        actual = calculate(entry["inputs"])
        for key, expected in entry["expected"].items():
            tolerance = dim_tol if key.endswith("Ratio") else mm_tol
            if not math.isclose(actual[key], float(expected), rel_tol=0.0, abs_tol=tolerance):
                failures.append((entry["id"], key, actual[key], expected))

    rounding_digits = int(ratio_data["roundingDigits"])
    for entry in ratio_data["cases"]:
        p_mpa = pressure(entry["designPressureBarg"], ratio_data["pressureUnit"])
        s_mpa = pressure(entry["allowableStressKsi"], ratio_data["stressUnit"])
        ratio = p_mpa / s_mpa
        if not math.isclose(ratio, float(entry["expectedRatioExact"]), rel_tol=0.0, abs_tol=1e-12):
            failures.append((f"A106-{entry['temperatureC']}C", "P/S exact", ratio, entry["expectedRatioExact"]))
        if round(ratio, rounding_digits) != float(entry["expectedRatioRounded"]):
            failures.append((f"A106-{entry['temperatureC']}C", "P/S rounded", round(ratio, rounding_digits), entry["expectedRatioRounded"]))

    if failures:
        for failure in failures:
            print("FAIL", *failure)
        return 1

    print(f"B31.3 independent thickness arithmetic passed: {len(data['cases'])}/{len(data['cases'])} valid cases")
    print(f"A106 Gr B independent P/S arithmetic passed: {len(ratio_data['cases'])}/{len(ratio_data['cases'])} cases")
    return 0


if __name__ == "__main__":
    sys.exit(main())
