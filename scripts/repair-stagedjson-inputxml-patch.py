#!/usr/bin/env python3
"""Apply narrow corrections to the temporary guarded patch script."""
from pathlib import Path

path = Path('scripts/stagedjson-inputxml-workpack-patch.py')
source = path.read_text(encoding='utf-8')


def replace_once(before: str, after: str, label: str) -> None:
    global source
    count = source.count(before)
    if count != 1:
        raise RuntimeError(f'{label} expected one anchor, found {count}')
    source = source.replace(before, after, 1)


replace_once(
    '''    source = replace_once(
        source,
        "    tref = str(branch.get('attributes', {}).get('TREF') or '').strip()",
        "    if pending_sif:\\n        _diag('WARNING', 'STAGED_OLET_SIF_UNRESOLVED', 'Pending OLET/SIF evidence had no emitted target element.', stage='build-topology', action='drop-pending-sif', context={'reference': pending_sif_ref})\\n    tref = str(branch.get('attributes', {}).get('TREF') or '').strip()",
        'pending sif completion diagnostic',
    )
''',
    '''    source = replace_once(
        source,
        "        route_cursor = effective_lpos\\n        i += 1\\n\\n    tref = str(branch.get('attributes', {}).get('TREF') or '').strip()",
        "        route_cursor = effective_lpos\\n        i += 1\\n\\n    if pending_sif:\\n        _diag('WARNING', 'STAGED_OLET_SIF_UNRESOLVED', 'Pending OLET/SIF evidence had no emitted target element.', stage='build-topology', action='drop-pending-sif', context={'reference': pending_sif_ref})\\n    tref = str(branch.get('attributes', {}).get('TREF') or '').strip()",
        'pending sif completion diagnostic',
    )
''',
    'pending SIF patch repair',
)

replace_once(
    """        if target is None:
''',
        'closest support segment selection',
""",
    """''',
        'closest support segment selection',
""",
    'closest support replacement terminator',
)

sidecar_before = "'_diagnostics.json'"
sidecar_count = source.count(sidecar_before)
if sidecar_count != 2:
    raise RuntimeError(f'worker sidecar suffix expected two anchors, found {sidecar_count}')
source = source.replace(
    sidecar_before,
    "'_stagedjson_to_inputxml_diagnostics.json'",
)

path.write_text(source, encoding='utf-8')
print('StagedJSON patch anchors and sidecar naming repaired.')
