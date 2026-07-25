#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CC="${CC:-clang}"
SYSROOT="${WASI_SYSROOT:-/usr}"
OUT="$ROOT/third_party/ufbx/fbx_parser.wasm"
"$CC" --target=wasm32-wasi --sysroot="$SYSROOT" -O2 -std=c99 -nostartfiles \
  -DUFBX_WASM_32BIT -DUFBX_NO_STDIO -DUFBX_ENABLE_ERROR_STACK \
  -I"$ROOT/third_party/ufbx" \
  "$ROOT/third_party/ufbx/ufbx.c" "$ROOT/third_party/ufbx/fbx_parser.c" \
  -Wl,--no-entry -Wl,--export=malloc -Wl,--export=free \
  -Wl,--export=fbx_parse -Wl,--export=fbx_result_ptr -Wl,--export=fbx_result_len \
  -Wl,--export=fbx_geometry_parse \
  -Wl,--export=fbx_geometry_result_ptr -Wl,--export=fbx_geometry_result_len \
  -Wl,--export=fbx_geometry_buffer_count \
  -Wl,--export=fbx_geometry_buffer_ptr -Wl,--export=fbx_geometry_buffer_len \
  -Wl,--export=fbx_error_ptr -Wl,--export=fbx_error_len -Wl,--export-memory \
  -Wl,--allow-undefined -Wl,--strip-all -Wl,--initial-memory=67108864 \
  -Wl,--max-memory=2147483648 -o "$OUT"
sha256sum "$OUT"
