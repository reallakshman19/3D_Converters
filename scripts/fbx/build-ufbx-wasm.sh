#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CC="${CC:-clang-18}"
WASI_SYSROOT="${WASI_SYSROOT:?WASI_SYSROOT must identify the governed WASI sysroot}"
OUT="${FBX_WASM_OUTPUT:-$ROOT/third_party/ufbx/fbx_parser.wasm}"

fail() {
  printf 'build-ufbx-wasm: %s\n' "$1" >&2
  exit 1
}

command -v "$CC" >/dev/null 2>&1 || fail "compiler not found: $CC"
COMPILER_PATH="$(command -v "$CC")"
COMPILER_VERSION="$("$CC" --version)"
printf '%s\n' "$COMPILER_VERSION" | grep -Eq '(^| )clang version 18([. ]|$)' \
  || fail "governed compiler major 18 is required"

WASI_SYSROOT="$(realpath "$WASI_SYSROOT")"
test -d "$WASI_SYSROOT/include" || fail "WASI sysroot include directory is missing"
if test ! -d "$WASI_SYSROOT/lib/wasm32-wasi" \
  && test ! -d "$WASI_SYSROOT/lib/wasm32-wasip1"; then
  fail "WASI sysroot library directory is missing"
fi

mkdir -p "$(dirname "$OUT")"
TMP="$(mktemp "${OUT}.tmp.XXXXXX")"
trap 'rm -f "$TMP"' EXIT

export LC_ALL=C TZ=UTC SOURCE_DATE_EPOCH=0
"$CC" --target=wasm32-wasi --sysroot="$WASI_SYSROOT" -O2 -std=c99 -nostartfiles \
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
  -Wl,--max-memory=2147483648 -o "$TMP"

mv "$TMP" "$OUT"
trap - EXIT
printf 'compiler.path=%s\n' "$COMPILER_PATH"
printf 'compiler.sha256=%s\n' "$(sha256sum "$COMPILER_PATH" | cut -d' ' -f1)"
printf 'compiler.version<<EOF\n%s\nEOF\n' "$COMPILER_VERSION"
printf 'wasi_sysroot.path=%s\n' "$WASI_SYSROOT"
printf 'output.path=%s\n' "$OUT"
printf 'output.sha256=%s\n' "$(sha256sum "$OUT" | cut -d' ' -f1)"
