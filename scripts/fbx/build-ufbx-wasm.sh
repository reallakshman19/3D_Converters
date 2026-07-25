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
COMPILER_PATH="$(realpath "$(command -v "$CC")")"
COMPILER_VERSION="$("$COMPILER_PATH" --version)"
printf '%s\n' "$COMPILER_VERSION" | grep -Eq '(^| )clang version 18([. ]|$)' \
  || fail "governed compiler major 18 is required"

LINKER_CANDIDATE="$("$COMPILER_PATH" --target=wasm32-wasi -print-prog-name=wasm-ld)"
if [[ "$LINKER_CANDIDATE" == */* ]]; then
  LINKER_PATH="$(realpath "$LINKER_CANDIDATE")"
else
  command -v "$LINKER_CANDIDATE" >/dev/null 2>&1 \
    || fail "linker not found: $LINKER_CANDIDATE"
  LINKER_PATH="$(realpath "$(command -v "$LINKER_CANDIDATE")")"
fi
LINKER_VERSION="$("$LINKER_PATH" --version)"
printf '%s\n' "$LINKER_VERSION" | grep -Eq '(^| )LLD 18([. ]|$)' \
  || fail "governed linker major 18 is required"

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
"$COMPILER_PATH" --target=wasm32-wasi --sysroot="$WASI_SYSROOT" -O2 -std=c99 -nostartfiles \
  -DUFBX_WASM_32BIT -DUFBX_NO_STDIO -DUFBX_ENABLE_ERROR_STACK \
  -I"$ROOT/third_party/ufbx" \
  "$ROOT/third_party/ufbx/ufbx.c" \
  "$ROOT/third_party/ufbx/fbx_parser.c" \
  "$ROOT/third_party/ufbx/fbx_attributes.c" \
  -Wl,--no-entry -Wl,--export=malloc -Wl,--export=free \
  -Wl,--export=fbx_parse -Wl,--export=fbx_result_ptr -Wl,--export=fbx_result_len \
  -Wl,--export=fbx_geometry_parse \
  -Wl,--export=fbx_geometry_result_ptr -Wl,--export=fbx_geometry_result_len \
  -Wl,--export=fbx_geometry_buffer_count \
  -Wl,--export=fbx_geometry_buffer_ptr -Wl,--export=fbx_geometry_buffer_len \
  -Wl,--export=fbx_attribute_parse \
  -Wl,--export=fbx_attribute_result_ptr -Wl,--export=fbx_attribute_result_len \
  -Wl,--export=fbx_attribute_buffer_count \
  -Wl,--export=fbx_attribute_buffer_ptr -Wl,--export=fbx_attribute_buffer_len \
  -Wl,--export=fbx_attribute_error_ptr -Wl,--export=fbx_attribute_error_len \
  -Wl,--export=fbx_error_ptr -Wl,--export=fbx_error_len -Wl,--export-memory \
  -Wl,--allow-undefined -Wl,--strip-all -Wl,--initial-memory=67108864 \
  -Wl,--max-memory=2147483648 -o "$TMP"

node "$ROOT/scripts/fbx/inspect-ufbx-wasm.mjs" "$TMP" >/dev/null
mv "$TMP" "$OUT"
trap - EXIT

printf 'target=wasm32-wasi\n'
printf 'compiler.path=%s\n' "$COMPILER_PATH"
printf 'compiler.sha256=%s\n' "$(sha256sum "$COMPILER_PATH" | cut -d' ' -f1)"
printf 'compiler.version<<EOF\n%s\nEOF\n' "$COMPILER_VERSION"
printf 'linker.path=%s\n' "$LINKER_PATH"
printf 'linker.sha256=%s\n' "$(sha256sum "$LINKER_PATH" | cut -d' ' -f1)"
printf 'linker.version<<EOF\n%s\nEOF\n' "$LINKER_VERSION"
printf 'wasi_sysroot.path=%s\n' "$WASI_SYSROOT"
printf 'output.path=%s\n' "$OUT"
printf 'output.bytes=%s\n' "$(stat -c '%s' "$OUT")"
printf 'output.sha256=%s\n' "$(sha256sum "$OUT" | cut -d' ' -f1)"
