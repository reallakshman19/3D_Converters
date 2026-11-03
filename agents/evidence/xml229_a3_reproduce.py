"""Replay the pinned A3 diagnostics without overwriting historical evidence.

Run from any directory: python agents/evidence/xml229_a3_reproduce.py
Requires Python standard library, Git, and the historical commit in local Git.
Outputs and exact native source exports stay under .local-test-tmp/.
"""
from pathlib import Path
import hashlib
import importlib
import importlib.util
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
PIN = '5c39dd7bdbb7f2f63a686823b72bdb81909d52af'
SCRATCH = ROOT / '.local-test-tmp/xml229-a3-portable-replay-20261103'
SOURCES = ('xml_to_cii2019.py', 'master_customization.py',
           'xml_to_cii2019_master_addon.py', 'xml_to_cii2019_patched.py')


def blob(path):
    try:
        return subprocess.check_output(
            ['git', 'cat-file', 'blob', f'{PIN}:{path}'], cwd=ROOT,
            stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as error:
        raise RuntimeError(f'Pinned source unavailable. First run: git fetch origin {PIN}') from error


def export_sources():
    native = SCRATCH / 'native-source'
    native.mkdir(parents=True, exist_ok=True)
    manifest = []
    for name in SOURCES:
        path = 'converters/scripts/' + name
        raw = blob(path)
        (native / name).write_bytes(raw)
        manifest.append(dict(path=path, sha256=hashlib.sha256(raw).hexdigest()))
    return native, manifest


def load_harness(native):
    path = ROOT / 'agents/evidence/xml229_alias_projection_qualification_20261103.py'
    spec = importlib.util.spec_from_file_location('xml229_a3_pinned_diagnostics', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    # Explicit diagnostic paths; the original production modules stay byte-exact.
    module.SCRATCH = SCRATCH
    module.NATIVE = native
    return module


def replay(module, native):
    sys.dont_write_bytecode = True
    sys.path.insert(0, str(native))
    base = importlib.import_module('xml_to_cii2019')
    patched = importlib.import_module('xml_to_cii2019_patched')
    raw = blob(module.FIXTURE)
    assert hashlib.sha256(raw).hexdigest() == module.EXPECTED_SHA
    original = module.ET.fromstring(raw)
    projected = module.project(original)
    module.source_checks(original, projected)
    structural = module.structural_checks(base, patched, original, projected)
    module.member_checks(base, original)
    module.mass_checks(original, projected)
    loaded = [dict(path='converters/scripts/'+name,
                   exactPinnedBytes=(native/name).read_bytes() == blob('converters/scripts/'+name))
              for name in SOURCES]
    module.check('loaded_native_source_identity', all(x['exactPinnedBytes'] for x in loaded),
                 loaded, 'Local Git blob bytes; exported directly, no mocks or source changes')
    return structural


def main():
    native, manifest = export_sources()
    module = load_harness(native)
    structural = replay(module, native)
    result = dict(pin=PIN, checks=module.CHECKS, structural=structural,
                  sourceManifest=manifest,
                  harnessStatus='PASS' if all(c['status'] == 'PASS' for c in module.CHECKS) else 'FAIL',
                  preservationVerdict='NAIVE_PROJECTION_NOT_QUALIFIED_IDENTITY_AND_MEMBER_LOSS',
                  authority='READ_ONLY',
                  scope='833 positive original nodes, not full governed Final or accepted mass validation')
    output = SCRATCH / 'replay-result.json'
    output.write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(dict(harnessStatus=result['harnessStatus'], checks=len(module.CHECKS),
                         preservationVerdict=result['preservationVerdict'], output=str(output))))
    assert len(module.CHECKS) == 13 and result['harnessStatus'] == 'PASS'


if __name__ == '__main__':
    main()
