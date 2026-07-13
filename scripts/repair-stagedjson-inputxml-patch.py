#!/usr/bin/env python3
"""Narrow one temporary patch anchor to the process_branch tail."""
from pathlib import Path

path = Path('scripts/stagedjson-inputxml-workpack-patch.py')
source = path.read_text(encoding='utf-8')
before = '''    source = replace_once(
        source,
        "    tref = str(branch.get('attributes', {}).get('TREF') or '').strip()",
        "    if pending_sif:\\n        _diag('WARNING', 'STAGED_OLET_SIF_UNRESOLVED', 'Pending OLET/SIF evidence had no emitted target element.', stage='build-topology', action='drop-pending-sif', context={'reference': pending_sif_ref})\\n    tref = str(branch.get('attributes', {}).get('TREF') or '').strip()",
        'pending sif completion diagnostic',
    )
'''
after = '''    source = replace_once(
        source,
        "        route_cursor = effective_lpos\\n        i += 1\\n\\n    tref = str(branch.get('attributes', {}).get('TREF') or '').strip()",
        "        route_cursor = effective_lpos\\n        i += 1\\n\\n    if pending_sif:\\n        _diag('WARNING', 'STAGED_OLET_SIF_UNRESOLVED', 'Pending OLET/SIF evidence had no emitted target element.', stage='build-topology', action='drop-pending-sif', context={'reference': pending_sif_ref})\\n    tref = str(branch.get('attributes', {}).get('TREF') or '').strip()",
        'pending sif completion diagnostic',
    )
'''
count = source.count(before)
if count != 1:
    raise RuntimeError(f'pending SIF patch repair expected one anchor, found {count}')
path.write_text(source.replace(before, after, 1), encoding='utf-8')
print('StagedJSON patch anchor repaired.')
