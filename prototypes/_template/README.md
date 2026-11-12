# __CARD_ID__ · __CARD_TITLE__

<!-- One page, plain words. A piping engineer must be able to follow it. -->

## What it does
<!-- 3-5 sentences: what goes in, what comes out, what it never does. -->

## Run
```
node cli.mjs <command> <args>        # prints JSON; exit 0 OK, 1 refused, 2 bad usage
node --test                          # all tests (run inside this folder)
node bench/run.mjs --root XCU=<xcu checkout> --root 3DC=<3d_converters checkout>
node ../_kit/card-check.mjs .        # layout / test-name / refusal / import / vendor checks
```

## Refusal codes
<!-- Every code the engine can return. card-check requires a test that mentions each one. -->
| code | meaning |
|---|---|
| `INPUT_SHA256_MISMATCH` | An input file is not the pinned benchmark (from the kit). |
| `__CARD_PREFIX___EMPTY_INPUT` | Example: the input file is empty. Replace with your own codes. |
