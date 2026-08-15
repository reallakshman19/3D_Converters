function failure(code, message, details = {}) {
  return { ok: false, code, message, details, canUseForDesignAuthority: false };
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function calculateChapterIxEquivalentAlternatingStress(input = {}) {
  const alternating = input.alternatingStressIntensityMpa;
  if (!finite(alternating) || alternating < 0) {
    return failure('INPUT_INVALID', 'alternatingStressIntensityMpa must be finite and >= 0.');
  }
  const route = String(input.seqRoute ?? '').trim();
  if (route === 'DIRECT_SALT_EQUAL_SEQ') {
    return {
      ok: true,
      canUseForDesignAuthority: false,
      route,
      alternatingStressIntensityMpa: alternating,
      equivalentAlternatingStressMpa: alternating,
      routeState: 'SYNTHETIC_REFERENCE_ONLY',
      formulation: 'HIGH_PR_DIRECT_SALT_EQUAL_SEQ_V1',
    };
  }
  if (route !== 'KD320_MEAN_STRESS_CORRECTION') {
    return failure('FATIGUE_ROUTE_UNSUPPORTED', `Unsupported seqRoute ${route || '(missing)'}.`);
  }
  for (const field of ['meanStressMpa', 'yieldStrengthMpa', 'beta']) {
    if (!finite(input[field])) return failure('MEAN_STRESS_INPUT_REQUIRED', `${field} must be explicitly supplied.`, { field });
  }
  if (!(input.yieldStrengthMpa > 0)) return failure('INPUT_INVALID', 'yieldStrengthMpa must be > 0.');
  if (input.beta < 0) return failure('INPUT_INVALID', 'beta cannot be negative.');
  const denominator = 1 - input.beta * (input.meanStressMpa / input.yieldStrengthMpa);
  if (!(denominator > 0)) {
    return failure('MEAN_STRESS_CORRECTION_INVALID', 'Mean-stress correction denominator must remain > 0.', { denominator });
  }
  return {
    ok: true,
    canUseForDesignAuthority: false,
    route,
    alternatingStressIntensityMpa: alternating,
    meanStressMpa: input.meanStressMpa,
    yieldStrengthMpa: input.yieldStrengthMpa,
    beta: input.beta,
    correctionDenominator: denominator,
    equivalentAlternatingStressMpa: alternating / denominator,
    routeState: 'PROVISIONAL_EXPLICIT_PARAMETERS_NOT_AUTHORIZED',
    formulation: 'HIGH_PR_SPEC_KD320_MEAN_STRESS_FORM_V1',
  };
}
