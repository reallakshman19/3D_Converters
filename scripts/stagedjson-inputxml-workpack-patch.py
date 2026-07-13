#!/usr/bin/env python3
"""Apply the audited StagedJSON -> InputXML Work Pack with exact anchors."""
from __future__ import annotations

import re
from pathlib import Path


def replace_once(source: str, before: str, after: str, label: str) -> str:
    count = source.count(before)
    if count != 1:
        raise RuntimeError(f'{label}: expected one anchor, found {count}')
    return source.replace(before, after, 1)


def replace_between(source: str, start: str, end: str, replacement: str, label: str) -> str:
    start_index = source.find(start)
    if start_index < 0:
        raise RuntimeError(f'{label}: missing start marker')
    end_index = source.find(end, start_index)
    if end_index < 0:
        raise RuntimeError(f'{label}: missing end marker')
    if source.find(start, start_index + len(start)) >= 0:
        raise RuntimeError(f'{label}: non-unique start marker')
    return source[:start_index] + replacement + source[end_index:]


def patch(path: str, transform) -> None:
    file_path = Path(path)
    before = file_path.read_text(encoding='utf-8')
    after = transform(before)
    if after == before:
        raise RuntimeError(f'{path}: patch produced no change')
    file_path.write_text(after, encoding='utf-8')


def patch_converter(source: str) -> str:
    source = replace_once(
        source,
        'SUPPORT            -> dropped (no RESTRAINT emitted)',
        'SUPPORT            -> classified and attached as RESTRAINT rows when enabled',
        'support docstring',
    )
    source = replace_once(
        source,
        'from inputxml_bookmark import InputXmlDefaults, load_defaults, SENTINEL\nimport support_restraint as support_restraint_mod',
        'from inputxml_bookmark import InputXmlDefaults, resolve_defaults, SENTINEL\n'
        'from stagedjson_inputxml_diagnostics import Diagnostics, diagnostics_path_for\n'
        'import support_restraint as support_restraint_mod',
        'diagnostics imports',
    )
    source = replace_once(
        source,
        '# ---------------------------------------------------------------------------\n# Geometry helpers\n# ---------------------------------------------------------------------------\n',
        '''_ACTIVE_DIAGNOSTICS: Diagnostics | None = None
_ACTIVE_SOURCE: dict[str, object] = {}
_DIAGNOSTIC_KEYS: set[tuple] = set()


def _source_context(**updates):
    _ACTIVE_SOURCE.update({key: value for key, value in updates.items() if value is not None})


def _diag(severity: str, code: str, message: str, **kwargs):
    if _ACTIVE_DIAGNOSTICS is None:
        return None
    merged = {
        'source_path': str(_ACTIVE_SOURCE.get('source_path', '')),
        'source_branch': str(_ACTIVE_SOURCE.get('source_branch', '')),
        'source_index': _ACTIVE_SOURCE.get('source_index'),
        'source_type': str(_ACTIVE_SOURCE.get('source_type', '')),
    }
    merged.update(kwargs)
    return _ACTIVE_DIAGNOSTICS.add(severity, code, message, **merged)


def _diag_once(key: tuple, severity: str, code: str, message: str, **kwargs):
    if key in _DIAGNOSTIC_KEYS:
        return None
    _DIAGNOSTIC_KEYS.add(key)
    return _diag(severity, code, message, **kwargs)


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------
''',
        'diagnostics helpers',
    )
    source = replace_between(
        source,
        'def pt(v):',
        'def vsub',
        '''def pt(v, field_name: str = ''):
    if not isinstance(v, dict):
        return None
    lower = all(axis in v for axis in ('x', 'y', 'z'))
    upper = all(axis in v for axis in ('X', 'Y', 'Z'))
    if not lower and not upper:
        if any(axis in v for axis in ('x', 'y', 'z', 'X', 'Y', 'Z')):
            _diag_once(
                ('coordinate-incomplete', str(_ACTIVE_SOURCE), field_name, repr(v)),
                'WARNING', 'STAGED_COORDINATE_INCOMPLETE',
                'Coordinate dictionary does not contain all three axes; it was not used.',
                stage='parse-coordinate', action='skip-coordinate', source_field=field_name,
                context={'value': v},
            )
        return None
    keys = ('x', 'y', 'z') if lower else ('X', 'Y', 'Z')
    try:
        values = tuple(float(v[key]) for key in keys)
    except (TypeError, ValueError):
        _diag_once(
            ('coordinate-invalid', str(_ACTIVE_SOURCE), field_name, repr(v)),
            'WARNING', 'STAGED_COORDINATE_INVALID',
            'Coordinate dictionary contains a non-numeric axis; it was not used.',
            stage='parse-coordinate', action='skip-coordinate', source_field=field_name,
            context={'value': v},
        )
        return None
    if not all(math.isfinite(value) for value in values):
        _diag_once(
            ('coordinate-nonfinite', str(_ACTIVE_SOURCE), field_name, repr(v)),
            'WARNING', 'STAGED_COORDINATE_INVALID',
            'Coordinate dictionary contains a non-finite axis; it was not used.',
            stage='parse-coordinate', action='skip-coordinate', source_field=field_name,
            context={'value': v},
        )
        return None
    return values


''',
        'strict coordinate parser',
    )
    source = replace_between(
        source,
        'OD_TABLE =',
        'def encode_delta',
        '''OD_TABLE = {750: 762.0, 600: 610.0, 400: 406.4, 100: 114.3}
EXPLICIT_OD_FIELDS = (
    'OUTSIDE_DIAMETER', 'OUTSIDEDIAMETER', 'OUTSIDE_DIAMETER_MM',
    'PIPE_OD', 'OD', 'DIAMETER',
)
BORE_FIELDS = ('ABORE', 'HBOR', 'LBORE', 'TBOR', 'BORE', 'NBORE', 'DBOR')


def od_from_bore(bore_mm):
    if bore_mm is None:
        return None
    for nominal, outside in OD_TABLE.items():
        if abs(bore_mm - nominal) <= 25:
            return outside
    return bore_mm


def _bore_od(attrs, branch_bore, defaults: InputXmlDefaults):
    for field_name in EXPLICIT_OD_FIELDS:
        value = mm_val(attrs.get(field_name))
        if value is not None and value > 0:
            _diag_once(
                ('od-explicit', str(_ACTIVE_SOURCE), field_name, value),
                'INFO', 'STAGED_OD_EXPLICIT',
                f'Outside diameter was read from explicit field {field_name}.',
                stage='resolve-diameter', action='use-source', source_field=field_name,
                output_field='DIAMETER', context={'outsideDiameterMm': value},
            )
            return value
    raw = next((attrs.get(field_name) for field_name in BORE_FIELDS if attrs.get(field_name) not in (None, '')), branch_bore)
    bore = mm_val(raw)
    if bore is None or bore <= 0:
        _diag_once(
            ('od-absent', str(_ACTIVE_SOURCE)), 'WARNING', 'STAGED_OD_MISSING',
            'No explicit outside diameter was available; DIAMETER remains sentinel.',
            stage='resolve-diameter', action='emit-sentinel', output_field='DIAMETER',
        )
        return None
    if defaults.infer_od_from_nominal_bore:
        outside = od_from_bore(bore)
        _diag_once(
            ('od-compat', str(_ACTIVE_SOURCE), bore, outside),
            'WARNING', 'STAGED_OD_INFERRED_COMPAT',
            'Outside diameter was inferred from nominal bore by explicit compatibility opt-in.',
            stage='resolve-diameter', action='infer-compatibility', source_field='nominal-bore',
            output_field='DIAMETER', context={'nominalBoreMm': bore, 'outsideDiameterMm': outside},
        )
        return outside
    _diag_once(
        ('od-missing', str(_ACTIVE_SOURCE), bore), 'WARNING', 'STAGED_OD_MISSING',
        'Nominal bore is not outside diameter; DIAMETER remains sentinel.',
        stage='resolve-diameter', action='emit-sentinel', source_field='nominal-bore',
        output_field='DIAMETER', context={'nominalBoreMm': bore},
    )
    return None


''',
        'outside diameter authority',
    )
    source = replace_once(
        source,
        '    hot_mod1: float\n    rigid: bool = False',
        '    hot_mod1: float\n    temp2: float = SENTINEL\n    temp3: float = SENTINEL\n    rigid: bool = False',
        'element temperature fields',
    )
    source = replace_between(
        source,
        'class NodeAllocator:',
        '# ---------------------------------------------------------------------------\n# Branch processor',
        '''class NodeAllocator:
    def __init__(self, start: int = 10, step: int = 10):
        if start <= 0:
            raise ValueError('node_start must be a positive integer.')
        if step <= 0:
            raise ValueError('node_step must be a positive integer.')
        self._map: dict[tuple, int] = {}
        self._point_by_node: dict[int, tuple] = {}
        self._used_nodes: set[int] = set()
        self._cur = start
        self._step = step

    def alloc(self) -> int:
        while self._cur in self._used_nodes:
            self._cur += self._step
        node = self._cur
        self._used_nodes.add(node)
        self._cur += self._step
        return node

    def alloc_mid(self, to_node: int) -> int:
        preferred = to_node - 1
        if preferred > 0 and preferred not in self._used_nodes:
            self._used_nodes.add(preferred)
            return preferred
        node = self.alloc()
        _diag('WARNING', 'STAGED_MID_NODE_RENUMBERED',
              'Preferred bend midpoint node was already allocated; a collision-safe node was used.',
              stage='allocate-node', action='renumber-midpoint', node=node,
              context={'preferredNode': preferred, 'toNode': to_node})
        return node

    def get_or_alloc(self, xyz) -> int:
        key = tuple(round(c) for c in xyz)
        if key not in self._map:
            node = self.alloc()
            self._map[key] = node
            self._point_by_node[node] = xyz
        else:
            node = self._map[key]
            _diag_once(
                ('node-coalesced', key, node), 'INFO', 'STAGED_NODE_COALESCED',
                'Coordinate was coalesced to an existing rounded node.',
                stage='allocate-node', action='coalesce', node=node,
                context={'roundedCoordinate': key, 'sourceCoordinate': xyz},
            )
        return node

    def set_node_point(self, node: int, xyz) -> None:
        self._used_nodes.add(node)
        self._point_by_node[node] = xyz

    def point_for_node(self, node: int):
        return self._point_by_node.get(node)

# ---------------------------------------------------------------------------
# Branch processor''',
        'collision-safe node allocator',
    )
    source = replace_between(
        source,
        'def _bore_od(attrs, branch_bore):',
        'def _cpos',
        '',
        'remove old bore resolver',
    )
    source = replace_once(
        source,
        "    children = branch.get('children', [])\n    branch_bore = branch.get('bore') or branch.get('attributes', {}).get('HBOR')",
        "    children = branch.get('children', [])\n    branch_name = str(branch.get('name') or branch.get('attributes', {}).get('NAME') or '').strip()\n    _source_context(source_branch=branch_name, source_index=None, source_type='BRANCH')\n    _diag('INFO', 'STAGED_SOURCE_BRANCH_READ', 'Staged branch entered the InputXML processor.', stage='read-source', action='read', count=len(children))\n    branch_bore = branch.get('bore') or branch.get('attributes', {}).get('HBOR')",
        'branch read diagnostic',
    )
    source = replace_once(
        source,
        "        child = children[i]\n        typ = child.get('type', 'UNKNOWN').upper()\n        attrs = child.get('attributes', {})",
        "        child = children[i]\n        typ = str(child.get('type', 'UNKNOWN')).upper()\n        attrs = child.get('attributes', {})\n        _source_context(source_branch=branch_name, source_index=i, source_type=typ, source_path=f'branch[{branch_name}].children[{i}]')\n        _diag('INFO', 'STAGED_SOURCE_COMPONENT_READ', 'Staged component entered the InputXML processor.', stage='read-source', action='read')",
        'component read diagnostic',
    )
    source = source.replace('_bore_od(attrs, branch_bore)', '_bore_od(attrs, branch_bore, defaults)')
    source = source.replace('_bore_od(next_attrs, branch_bore)', '_bore_od(next_attrs, branch_bore, defaults)')
    source = replace_once(
        source,
        "            fate = gask_fate.get(i, 'standalone')",
        "            fate = gask_fate.get(i, 'standalone')\n            _diag('INFO', 'STAGED_GASK_ABSORBED' if fate != 'standalone' else 'STAGED_COMPONENT_EMITTED', f'GASK decision: {fate}.', stage='build-topology', action=fate, context={'fate': fate})",
        'gasket decision diagnostic',
    )
    source = replace_once(
        source,
        "        if typ in ('OLET', 'SUPPORT'):\n            if typ == 'OLET':",
        "        if typ in ('OLET', 'SUPPORT'):\n            if typ == 'SUPPORT':\n                _diag('INFO', 'STAGED_SUPPORT_DEFERRED', 'SUPPORT is deferred to the support classification pass.', stage='build-topology', action='defer-support')\n            if typ == 'OLET':",
        'support defer diagnostic',
    )
    source = replace_once(
        source,
        "                pending_sif_point = pt(attrs.get('POS')) or pt(attrs.get('APOS')) or pt(attrs.get('LPOS'))",
        "                pending_sif_point = pt(attrs.get('POS'), 'POS') or pt(attrs.get('APOS'), 'APOS') or pt(attrs.get('LPOS'), 'LPOS')\n                _diag('INFO', 'STAGED_OLET_SIF_PENDING', 'OLET was deferred as pending SIF evidence.', stage='build-topology', action='defer-sif')",
        'olet pending diagnostic',
    )
    source = source.replace(
        "            if apos_raw is None or lpos_raw is None:\n                i += 1\n                continue",
        "            if apos_raw is None or lpos_raw is None:\n                _diag('WARNING', 'STAGED_COMPONENT_SKIPPED', 'PIPE was skipped because APOS or LPOS was unavailable.', stage='build-topology', action='skip', source_field='APOS/LPOS')\n                i += 1\n                continue",
        1,
    )
    source = replace_once(
        source,
        "            if cpos_raw is None:\n                cpos_raw = apos_raw\n            od = _bore_od(attrs, branch_bore, defaults) or prev_od or SENTINEL",
        "            if cpos_raw is None:\n                cpos_raw = apos_raw\n            if apos_raw is None or lpos_raw is None or cpos_raw is None:\n                _diag('WARNING', 'STAGED_COMPONENT_SKIPPED', 'BEND/ELBO was skipped because APOS, CPOS or LPOS was unavailable.', stage='build-topology', action='skip', source_field='APOS/CPOS/LPOS')\n                i += 1\n                continue\n            od = _bore_od(attrs, branch_bore, defaults) or prev_od or SENTINEL",
        'bend missing geometry diagnostic',
    )
    source = replace_once(
        source,
        "        if apos_raw is None or lpos_raw is None:\n            i += 1\n            continue",
        "        if apos_raw is None or lpos_raw is None:\n            _diag('WARNING', 'STAGED_COMPONENT_SKIPPED', 'Component was skipped because APOS or LPOS was unavailable.', stage='build-topology', action='skip', source_field='APOS/LPOS')\n            i += 1\n            continue",
        'regular missing geometry diagnostic',
    )
    source = replace_once(
        source,
        "    tref = str(branch.get('attributes', {}).get('TREF') or '').strip()",
        "    if pending_sif:\n        _diag('WARNING', 'STAGED_OLET_SIF_UNRESOLVED', 'Pending OLET/SIF evidence had no emitted target element.', stage='build-topology', action='drop-pending-sif', context={'reference': pending_sif_ref})\n    tref = str(branch.get('attributes', {}).get('TREF') or '').strip()",
        'pending sif completion diagnostic',
    )
    source = replace_once(
        source,
        "    for r in el.restraints:\n        rows.append(r)\n    return rows[:6]",
        "    for r in el.restraints:\n        rows.append(r)\n    if len(rows) > 6:\n        _diag('WARNING', 'STAGED_RESTRAINT_SLOT_TRUNCATED', 'InputXML supports six restraint rows per element; additional rows were not emitted.', stage='emit-restraints', action='truncate-fixed-slots', node=el.to_node, count=len(rows) - 6, context={'retained': 6, 'sourceRows': len(rows), 'fromNode': el.from_node, 'toNode': el.to_node})\n    return rows[:6]",
        'restraint truncation diagnostic',
    )
    source = replace_once(source, 'def element_to_xml(el: Element, node_points: dict[int, tuple] | None = None) -> str:', 'def element_to_xml(el: Element, defaults: InputXmlDefaults, node_points: dict[int, tuple] | None = None) -> str:', 'serializer defaults signature')
    source = replace_once(source, "f' TEMP_EXP_C2=\"{f(S)}\" TEMP_EXP_C3=\"{f(S)}\" TEMP_EXP_C4=\"{f(S)}\"'", "f' TEMP_EXP_C2=\"{f(el.temp2)}\" TEMP_EXP_C3=\"{f(el.temp3)}\" TEMP_EXP_C4=\"{f(S)}\"'", 'temperature2/3 serialization')
    source = replace_once(source, "f' POISSONS=\"{f(el.modulus != el.modulus and 0.0 or 0.292)}\"'\n        f' PIPE_DENSITY=\"0.007833\"'", "f' POISSONS=\"{f(defaults.poissons)}\"'\n        f' PIPE_DENSITY=\"{f(defaults.pipe_density)}\"'", 'material constants serialization')
    source = replace_once(source, "f' MATERIAL_NUM=\"1.000000\" MATERIAL_NAME=\"LOW CARBON\"'", "f' MATERIAL_NUM=\"{f(defaults.material_num)}\" MATERIAL_NAME=\"{xml_attr(defaults.material_name)}\"'", 'material defaults serialization')
    source = replace_once(source, "body = '\\n'.join(element_to_xml(e, node_points) for e in elements)", "body = '\\n'.join(element_to_xml(e, defaults, node_points) for e in elements)", 'build xml serializer call')
    source = replace_between(
        source,
        'def order_branches(data: list[dict]) -> list[dict]:',
        'def detect_anchors',
        '''def order_branches(data: list[dict]) -> list[dict]:
    """Retain the historical main-run-first ordering, but disclose changes."""
    def pipe_count(branch):
        return sum(1 for child in branch.get('children', []) if child.get('type') == 'PIPE')
    ordered = sorted(data, key=pipe_count, reverse=True)
    before = [str(branch.get('name') or '') for branch in data]
    after = [str(branch.get('name') or '') for branch in ordered]
    if before != after:
        _diag('WARNING', 'STAGED_BRANCH_ORDER_CHANGED',
              'Branches were reordered by descending PIPE count for compatibility.',
              stage='order-branches', action='sort-compatibility',
              context={'sourceOrder': before, 'processingOrder': after})
    return ordered


''',
        'branch ordering diagnostic',
    )
    source = replace_once(source, "        anchors.append((0, 'from'))", "        anchors.append((0, 'from'))\n        _diag('WARNING', 'STAGED_ANCHOR_INFERRED', 'First generated model node was anchored by compatibility rule.', stage='infer-anchor', action='anchor-first', node=all_elements[0].from_node)", 'first anchor diagnostic')
    source = replace_once(source, "                    anchors.append((anchor_to_idx, 'to'))", "                    anchors.append((anchor_to_idx, 'to'))\n                    _diag('WARNING', 'STAGED_ANCHOR_INFERRED', 'Zero-delta BEND start was anchored by compatibility rule.', stage='infer-anchor', action='anchor-zero-bend', node=all_elements[anchor_to_idx].to_node)", 'bend anchor diagnostic')
    source = replace_once(source, "                anchors.append((end_idx, 'to'))", "                anchors.append((end_idx, 'to'))\n                _diag('WARNING', 'STAGED_ANCHOR_INFERRED', 'External TREF branch ending was anchored by compatibility rule.', stage='infer-anchor', action='anchor-external-tref', node=all_elements[end_idx].to_node, context={'tref': tref})", 'external anchor diagnostic')
    source = replace_between(
        source,
        'def _collect_supports(branches: list[dict]) -> list[dict]:',
        'def _project_onto_segment',
        '''def _collect_supports(branches: list[dict]) -> list[dict]:
    """Return every positioned SUPPORT and diagnose unresolved source rows."""
    supports = []
    for branch in branches:
        branch_name = str(branch.get('name') or '')
        for index, child in enumerate(branch.get('children', [])):
            if child.get('type') != 'SUPPORT':
                continue
            attrs = child.get('attributes', {})
            _source_context(source_branch=branch_name, source_index=index, source_type='SUPPORT', source_path=f'branch[{branch_name}].children[{index}]')
            point = (pt(attrs.get('POS'), 'POS') or pt(attrs.get('BPOS'), 'BPOS')
                     or pt(attrs.get('APOS'), 'APOS') or pt(attrs.get('LPOS'), 'LPOS'))
            if point is None:
                _diag('WARNING', 'STAGED_SUPPORT_UNSNAPPED', 'SUPPORT has no complete position and was not attached.', stage='map-support', action='skip-no-position')
                continue
            supports.append({'attrs': attrs, 'point': point, 'branch': branch_name, 'index': index})
    return supports


''',
        'support collection diagnostics',
    )
    source = replace_once(
        source,
        "        if not rows:\n            continue\n        stats['classified'] += 1",
        "        if not rows:\n            _source_context(source_branch=sup.get('branch', ''), source_index=sup.get('index'), source_type='SUPPORT')\n            _diag('WARNING', 'STAGED_SUPPORT_UNCLASSIFIED', 'SUPPORT classification produced no restraint rows.', stage='map-support', action='skip-unclassified', context={'kind': kind})\n            continue\n        stats['classified'] += 1\n        _source_context(source_branch=sup.get('branch', ''), source_index=sup.get('index'), source_type='SUPPORT')\n        _diag('INFO', 'STAGED_SUPPORT_CLASSIFIED', 'SUPPORT was classified into restraint rows.', stage='map-support', action='classify', count=len(rows), context={'kind': kind})",
        'support classification diagnostic',
    )
    source = replace_once(
        source,
        "                stats['attached_existing'] += 1\n                stats['rows'] += len(rows)\n                continue",
        "                stats['attached_existing'] += 1\n                stats['rows'] += len(rows)\n                _diag('INFO', 'STAGED_SUPPORT_ATTACHED', 'SUPPORT was attached to an existing node.', stage='map-support', action='attach-existing', node=best_node, count=len(rows), context={'distanceMm': best_d, 'kind': kind})\n                continue",
        'existing support attach diagnostic',
    )
    source = replace_between(
        source,
        "        # 2) Lies on a straight element -> split and insert a node.\n        target_idx, target = None, None",
        "        if target is None:",
        '''        # 2) Lies on a straight element -> choose the closest eligible segment.
        candidates = []
        for idx, element in enumerate(all_elements):
            if element.bend_radius != SENTINEL or element.rigid:
                continue
            start = na.point_for_node(element.from_node)
            end = na.point_for_node(element.to_node)
            if start is None or end is None:
                continue
            t, projected, perpendicular = _project_onto_segment(p, start, end)
            if 1e-3 < t < 1 - 1e-3 and perpendicular <= snap_tol:
                candidates.append((perpendicular, idx, element, start, end, projected))
        target_idx, target, selected_distance = None, None, None
        if candidates:
            selected_distance, target_idx, element, start, end, projected = min(candidates, key=lambda row: (row[0], row[1]))
            target = (element, start, end, projected)
        if target is None:
''',
        'closest support segment selection',
    )
    source = replace_once(
        source,
        "            stats['unsnapped'] += 1\n            continue",
        "            stats['unsnapped'] += 1\n            _diag('WARNING', 'STAGED_SUPPORT_UNSNAPPED', 'SUPPORT did not match an eligible straight segment within tolerance.', stage='map-support', action='skip-unsnapped', context={'snapToleranceMm': snap_tol})\n            continue",
        'unsnapped support diagnostic',
    )
    source = replace_once(
        source,
        "        stats['split_inserted'] += 1\n        stats['rows'] += len(rows)",
        "        stats['split_inserted'] += 1\n        stats['rows'] += len(rows)\n        _diag('INFO', 'STAGED_SUPPORT_ATTACHED', 'SUPPORT was attached by splitting the closest straight segment.', stage='map-support', action='split-and-attach', element_index=target_idx, node=new_node, count=len(rows), context={'distanceMm': selected_distance, 'candidateCount': len(candidates), 'kind': kind})",
        'split support attach diagnostic',
    )
    source = replace_between(
        source,
        'def convert(input_path: Path, output_path: Path, defaults: InputXmlDefaults,',
        '# ---------------------------------------------------------------------------\n# CLI',
        '''def convert(input_path: Path, output_path: Path, defaults: InputXmlDefaults,
            job_name: str | None = None, node_start: int = 10, node_step: int = 10,
            support_config: dict | None = None, diagnostics: Diagnostics | None = None,
            default_origins: dict[str, str] | None = None):
    global _ACTIVE_DIAGNOSTICS, _ACTIVE_SOURCE, _DIAGNOSTIC_KEYS
    _ACTIVE_DIAGNOSTICS = diagnostics or Diagnostics(source_name=input_path.name)
    _ACTIVE_SOURCE = {'source_path': input_path.name, 'source_branch': '', 'source_index': None, 'source_type': ''}
    _DIAGNOSTIC_KEYS = set()
    sidecar_path = diagnostics_path_for(output_path)

    data = json.loads(input_path.read_text(encoding='utf-8-sig'))
    if not isinstance(data, list):
        data = [data]
    _ACTIVE_DIAGNOSTICS.metadata.update({
        'nodeStart': node_start,
        'nodeStep': node_step,
        'verticalAxis': defaults.vertical_axis,
        'datum': {'e': defaults.datum_e, 'n': defaults.datum_n, 'u': defaults.datum_u},
        'inferOdFromNominalBore': defaults.infer_od_from_nominal_bore,
        'autoAnchors': defaults.auto_anchors,
    })
    for field_name in ('temperature1', 'temperature2', 'temperature3', 'wall_thickness', 'modulus', 'hot_mod1', 'poissons', 'pipe_density', 'material_num', 'material_name'):
        _diag('INFO', 'STAGED_DEFAULT_APPLIED', f'{field_name} resolved from {(default_origins or {}).get(field_name, "compatibility-default")}.', stage='resolve-defaults', action='apply-default', source_field=field_name, output_field=field_name, context={'value': getattr(defaults, field_name), 'origin': (default_origins or {}).get(field_name, 'compatibility-default')})

    transform_coordinates(data, defaults)
    _diag('INFO', 'STAGED_COORDINATE_TRANSFORMED', 'World datum and vertical-axis transform were applied before topology generation.', stage='transform-coordinate', action='transform', context={'verticalAxis': defaults.vertical_axis, 'datumE': defaults.datum_e, 'datumN': defaults.datum_n, 'datumU': defaults.datum_u})

    branches = order_branches(data)
    allocator = NodeAllocator(node_start, node_step)
    all_elements: list[Element] = []
    branch_start_indices: list[int] = []
    node_refs: dict[str, dict[str, object]] = {}

    for branch in branches:
        branch_start_indices.append(len(all_elements))
        all_elements.extend(process_branch(branch, allocator, defaults, len(all_elements), node_refs))

    if defaults.auto_anchors:
        add_anchors(all_elements, detect_anchors(branches, all_elements, branch_start_indices))
    else:
        _diag('INFO', 'STAGED_AUTO_ANCHORS_DISABLED', 'Automatic anchor inference was disabled explicitly.', stage='infer-anchor', action='skip-auto-anchors')

    support_cfg = support_restraint_mod.merge_config(support_config)
    support_stats = apply_support_restraints(all_elements, allocator, branches, defaults, support_cfg)

    if all_elements:
        all_elements[0].temp2 = defaults.temperature2
        all_elements[0].temp3 = defaults.temperature3
    if not all_elements:
        _diag('ERROR', 'STAGED_ZERO_ELEMENTS', 'No PIPINGELEMENT rows were generated from the staged hierarchy.', stage='finalize', action='fail-zero-output')
        _ACTIVE_DIAGNOSTICS.write(sidecar_path, output_ready=False, output_name=output_path.name)
        raise ValueError('StagedJSON conversion produced zero PIPINGELEMENT rows.')

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(build_xml(job_name or input_path.stem, all_elements, defaults, allocator._point_by_node), encoding='utf-8')
    _diag('OK', 'STAGED_INPUTXML_WRITTEN', 'InputXML output was written with at least one PIPINGELEMENT.', stage='finalize', action='write-output', count=len(all_elements))
    _ACTIVE_DIAGNOSTICS.metadata['supportStats'] = support_stats
    _ACTIVE_DIAGNOSTICS.write(sidecar_path, output_ready=True, output_name=output_path.name)

    print(f'Wrote {len(all_elements)} elements to {output_path}')
    print(f'Wrote diagnostics to {sidecar_path}')
    bend_count = sum(1 for element in all_elements if element.bend_radius != SENTINEL and element.bend_mid_node > 0)
    rigid_count = sum(1 for element in all_elements if element.rigid)
    restraint_count = sum(1 for element in all_elements if element.rest_node > 0 or element.restraints)
    sif_count = sum(1 for element in all_elements if element.sif_node > 0)
    if support_stats['supports']:
        print(f"  supports: scanned={support_stats['supports']} classified={support_stats['classified']} attached={support_stats['attached_existing']} split={support_stats['split_inserted']} unsnapped={support_stats['unsnapped']} rows={support_stats['rows']}")
    print(f'  NUMELT={len(all_elements)} NUMBEND={bend_count} NUMRIGID={rigid_count} NUMREST={restraint_count} NUMISECT={sif_count}')

# ---------------------------------------------------------------------------
# CLI''',
        'conversion lifecycle and sidecar',
    )
    source = replace_between(
        source,
        'def build_parser() -> argparse.ArgumentParser:',
        "if __name__ == '__main__':",
        '''def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='Convert staged JSON to CAESAR II InputXML')
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--bookmark', type=Path)
    parser.add_argument('--bookmark-json', type=str, help='Inline JSON defaults; overrides bookmark file values.')
    parser.add_argument('--support-config', type=Path)
    parser.add_argument('--support-config-json', type=str)
    parser.add_argument('--node-start', type=int, default=10)
    parser.add_argument('--node-step', type=int, default=10)
    parser.add_argument('--job-name', type=str)
    parser.add_argument('--temperature1', type=float)
    parser.add_argument('--wall-thickness', type=float)
    parser.add_argument('--modulus', type=float)
    parser.add_argument('--material-num', type=float)
    parser.add_argument('--material-name', type=str)
    parser.add_argument('--version', type=str)
    parser.add_argument('--vertical-axis', choices=['Y', 'Z', 'y', 'z'])
    parser.add_argument('--datum-e', type=float)
    parser.add_argument('--datum-n', type=float)
    parser.add_argument('--datum-u', type=float)
    parser.add_argument('--infer-od-from-nominal-bore', action='store_true', help='Compatibility opt-in: infer OD from nominal bore.')
    parser.add_argument('--no-auto-anchors', action='store_true', help='Disable inferred first/zero-bend/external anchors.')
    parser.add_argument('--no-supports', action='store_true')
    return parser


def main():
    args = build_parser().parse_args()
    diagnostics = Diagnostics(source_name=args.input.name)
    sidecar_path = diagnostics_path_for(args.output)
    try:
        overrides = {
            'temperature1': args.temperature1,
            'wall_thickness': args.wall_thickness,
            'modulus': args.modulus,
            'material_num': args.material_num,
            'material_name': args.material_name,
            'version': args.version,
            'vertical_axis': args.vertical_axis.upper() if args.vertical_axis else None,
            'datum_e': args.datum_e,
            'datum_n': args.datum_n,
            'datum_u': args.datum_u,
            'infer_od_from_nominal_bore': True if args.infer_od_from_nominal_bore else None,
            'auto_anchors': False if args.no_auto_anchors else None,
        }
        defaults, origins, issues = resolve_defaults(args.bookmark, args.bookmark_json, overrides)
        for issue in issues:
            diagnostics.add('WARNING', issue.get('code', 'STAGED_BOOKMARK_ISSUE'), issue.get('message', 'Bookmark field was not applied.'), stage='resolve-defaults', action='ignore-invalid-default', source_field=issue.get('field', ''), context=issue)
        support_config = None
        if args.support_config:
            support_config = json.loads(args.support_config.read_text(encoding='utf-8'))
        if args.support_config_json:
            support_config = {**(support_config or {}), **json.loads(args.support_config_json)}
        if args.no_supports:
            support_config = {**(support_config or {}), 'enabled': False}
        convert(args.input, args.output, defaults, job_name=args.job_name, node_start=args.node_start, node_step=args.node_step, support_config=support_config, diagnostics=diagnostics, default_origins=origins)
    except Exception as error:
        if not sidecar_path.exists():
            diagnostics.add('ERROR', 'STAGED_CONVERSION_FAILED', str(error), stage='finalize', action='fail-conversion')
            diagnostics.write(sidecar_path, output_ready=False, output_name=args.output.name)
        raise


''',
        'CLI and defaults provenance',
    )
    return source


def patch_invocation(source: str) -> str:
    before = '''  } else if (converterId === 'stagedjson_to_inputxml') {
    pushOptionalStringArg(argv, '--bookmark', options?.inputxmlBookmark);
    pushOptionalNumberArg(argv, '--node-start', options?.nodeStart);
    pushOptionalNumberArg(argv, '--node-step', options?.nodeStep);
    pushOptionalNumberArg(argv, '--temperature1', options?.temperature1);
    pushOptionalNumberArg(argv, '--wall-thickness', options?.wallThickness);
    pushOptionalNumberArg(argv, '--modulus', options?.modulus);
    pushOptionalStringArg(argv, '--material-name', options?.materialName);
    pushOptionalStringArg(argv, '--job-name', options?.jobName);
    pushOptionalStringArg(argv, '--vertical-axis', options?.verticalAxis);
    pushOptionalStringArg(argv, '--support-config-json', options?.supportConfigJson);
    pushOptionalNumberArg(argv, '--datum-e', options?.datumE);
    pushOptionalNumberArg(argv, '--datum-n', options?.datumN);
    pushOptionalNumberArg(argv, '--datum-u', options?.datumU);
    if (options?.disableSupports) argv.push('--no-supports');
'''
    after = '''  } else if (converterId === 'stagedjson_to_inputxml') {
    const legacyBookmark = toStringValue(options?.inputxmlBookmark).trim();
    const inlineBookmark = toStringValue(options?.inputxmlBookmarkJson).trim()
      || (legacyBookmark.startsWith('{') ? legacyBookmark : '');
    const bookmarkPath = legacyBookmark && !legacyBookmark.startsWith('{') ? legacyBookmark : '';
    pushOptionalStringArg(argv, '--bookmark', bookmarkPath);
    pushOptionalStringArg(argv, '--bookmark-json', inlineBookmark);
    pushOptionalNumberArg(argv, '--node-start', options?.nodeStart);
    pushOptionalNumberArg(argv, '--node-step', options?.nodeStep);
    pushOptionalNumberArg(argv, '--temperature1', options?.temperature1);
    pushOptionalNumberArg(argv, '--wall-thickness', options?.wallThickness);
    pushOptionalNumberArg(argv, '--modulus', options?.modulus);
    pushOptionalNumberArg(argv, '--material-num', options?.materialNum);
    pushOptionalStringArg(argv, '--material-name', options?.materialName);
    pushOptionalStringArg(argv, '--job-name', options?.jobName);
    pushOptionalStringArg(argv, '--vertical-axis', options?.verticalAxis);
    pushOptionalStringArg(argv, '--support-config-json', options?.supportConfigJson);
    pushOptionalNumberArg(argv, '--datum-e', options?.datumE);
    pushOptionalNumberArg(argv, '--datum-n', options?.datumN);
    pushOptionalNumberArg(argv, '--datum-u', options?.datumU);
    if (options?.inferOdFromNominalBore) argv.push('--infer-od-from-nominal-bore');
    if (options?.autoAnchors === false) argv.push('--no-auto-anchors');
    if (options?.disableSupports) argv.push('--no-supports');
'''
    return replace_once(source, before, after, 'stagedjson invocation options')


def patch_registry(source: str) -> str:
    before = '''  stagedjson_to_inputxml: {
    id: 'stagedjson_to_inputxml',
    label: 'StagedJSON -> InputXML',
    primaryAccept: '.json,.JSON',
    primaryLabel: 'Staged JSON Input',
    secondaryLabel: '',
    secondaryAccept: '',
    description: 'Convert staged hierarchy JSON to CAESAR II Input XML using benchmark defaults (B7410250).',
    defaults: {
      nodeStart: 10,
      nodeStep: 10,
      temperature1: 50.0,
      wallThickness: 0.01,
      verticalAxis: 'Y',
      disableSupports: false,
    },
    fields: [
      { key: 'inputxmlBookmark', label: 'Defaults Bookmark JSON (overrides B7410250 benchmark)', type: 'text' },
      { key: 'nodeStart', label: 'Node Start', type: 'number', step: '1' },
      { key: 'nodeStep', label: 'Node Step', type: 'number', step: '1' },
      { key: 'jobName', label: 'Job Name', type: 'text' },
      { key: 'temperature1', label: 'Temperature 1 (C)', type: 'number', step: '0.1' },
      { key: 'wallThickness', label: 'Wall Thickness (mm)', type: 'number', step: '0.001' },
      { key: 'modulus', label: 'Modulus', type: 'number', step: '0.1' },
      { key: 'materialName', label: 'Material Name', type: 'text' },
      { key: 'verticalAxis', label: 'Vertical Axis (PDMS Up ->)', type: 'select', options: ['Y', 'Z'] },
      { key: 'disableSupports', label: 'Disable support -> restraint mapping', type: 'checkbox' },
      { key: 'supportConfigJson', label: 'Support Restraint Config JSON (overrides)', type: 'text' },
      { key: 'datumE', label: 'World Datum E (mm)', type: 'number', step: '0.001' },
      { key: 'datumN', label: 'World Datum N (mm)', type: 'number', step: '0.001' },
      { key: 'datumU', label: 'World Datum U (mm)', type: 'number', step: '0.001' },
    ],
  },
'''
    after = '''  stagedjson_to_inputxml: {
    id: 'stagedjson_to_inputxml',
    label: 'StagedJSON -> InputXML',
    primaryAccept: '.json,.JSON',
    primaryLabel: 'Staged JSON Input',
    secondaryLabel: '',
    secondaryAccept: '',
    description: 'Convert staged hierarchy JSON to CAESAR II InputXML with explicit source authority and a diagnostics sidecar.',
    defaults: {
      inputxmlBookmarkJson: '{}',
      nodeStart: 10,
      nodeStep: 10,
      temperature1: 50.0,
      wallThickness: 0.01,
      materialNum: 1,
      materialName: 'LOW CARBON',
      verticalAxis: 'Y',
      inferOdFromNominalBore: false,
      autoAnchors: true,
      disableSupports: false,
    },
    fields: [
      { key: 'inputxmlBookmarkJson', label: 'Defaults Bookmark JSON', type: 'json-popup' },
      { key: 'nodeStart', label: 'Node Start', type: 'number', step: '1' },
      { key: 'nodeStep', label: 'Node Step', type: 'number', step: '1' },
      { key: 'jobName', label: 'Job Name', type: 'text' },
      { key: 'temperature1', label: 'Temperature 1 (C)', type: 'number', step: '0.1' },
      { key: 'wallThickness', label: 'Wall Thickness (mm)', type: 'number', step: '0.001' },
      { key: 'modulus', label: 'Modulus', type: 'number', step: '0.1' },
      { key: 'materialNum', label: 'Material Number', type: 'number', step: '1' },
      { key: 'materialName', label: 'Material Name', type: 'text' },
      { key: 'verticalAxis', label: 'Vertical Axis (PDMS Up ->)', type: 'select', options: ['Y', 'Z'] },
      { key: 'inferOdFromNominalBore', label: 'Compatibility: infer OD from nominal bore', type: 'checkbox' },
      { key: 'autoAnchors', label: 'Infer compatibility anchors', type: 'checkbox' },
      { key: 'disableSupports', label: 'Disable support -> restraint mapping', type: 'checkbox' },
      { key: 'supportConfigJson', label: 'Support Restraint Config JSON (overrides)', type: 'json-popup' },
      { key: 'datumE', label: 'World Datum E (mm)', type: 'number', step: '0.001' },
      { key: 'datumN', label: 'World Datum N (mm)', type: 'number', step: '0.001' },
      { key: 'datumU', label: 'World Datum U (mm)', type: 'number', step: '0.001' },
    ],
  },
'''
    return replace_once(source, before, after, 'stagedjson registry definition')


def patch_worker(source: str) -> str:
    source = replace_once(source, "  'stagedjson_to_inputxml.py',\n  'support_restraint.py',", "  'stagedjson_to_inputxml.py',\n  'stagedjson_inputxml_diagnostics.py',\n  'support_restraint.py',", 'worker diagnostics script load')
    source = replace_once(
        source,
        "  const outputs = [\n    { name: invocation.outputName, text: outputText, mime: _inferTextMime(invocation.outputName) },\n  ];",
        "  const outputs = [\n    { name: invocation.outputName, text: outputText, mime: _inferTextMime(invocation.outputName) },\n  ];\n  let stagedInputXmlDiagnostics = null;\n  if (converterId === 'stagedjson_to_inputxml') {\n    const diagnosticsName = invocation.outputName.replace(/\\.xml$/i, '_diagnostics.json');\n    const diagnosticsPath = invocation.outputPath.replace(/\\.xml$/i, '_diagnostics.json');\n    try {\n      const diagnosticsText = pyodide.FS.readFile(diagnosticsPath, { encoding: 'utf8' });\n      stagedInputXmlDiagnostics = JSON.parse(diagnosticsText);\n      outputs.push({ name: diagnosticsName, text: diagnosticsText, mime: 'application/json;charset=utf-8' });\n    } catch (error) {\n      stderrLines.push(`StagedJSON InputXML diagnostics sidecar unavailable: ${_errorToString(error)}`);\n    }\n  }",
        'worker sidecar read',
    )
    source = replace_once(source, "      warnings: ciiWarnings,\n", "      warnings: ciiWarnings,\n      diagnostics: stagedInputXmlDiagnostics,\n", 'worker structured diagnostics log')
    return source


patch('converters/scripts/stagedjson_to_inputxml.py', patch_converter)
patch('converters/invocation-builder.js', patch_invocation)
patch('tabs/model-converters/converter-registry.js', patch_registry)
patch('converters/py-worker.js', patch_worker)
print('Guarded StagedJSON InputXML Work Pack patch applied.')
