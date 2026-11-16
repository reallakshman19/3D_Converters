"""Regression tests for the explicit POS/PS/ROOT match contract."""
import sys
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'converters' / 'scripts'))
from xml229_prefinal_restraint_source import (  # noqa: E402
    calibrated_groups, identity_groups, literal_root, match_mode, point,
    ps_canonical, ps_suffixes, resolve, source_entries, tolerance, _ResolutionIndex,
)

LINE = '/ASIM-1840-3"-S8810389-91261M7-01/B1'
POS = {'x': 1032747.41, 'y': 1991704.95, 'z': 1100}


def config(mode):
    return {'resolverJsonTrace': {'matchMode': mode, 'coordinateTolerance': 6,
                                  'psFallback': {'stripSuffixes': ['.1.2', '-1']}},
            'dtxrPositionOffset': {'enabled': True, 'xOffset': 0, 'yOffset': 0,
                                   'zOffset': 100000}}


def member(name, role='REST', root='SL-1840203 (REF)', position=None):
    return {'type': 'SUPPORT', 'attributes': {
        'NAME': name, 'DTXR': role, 'CMPSUPREFN': root,
        'POS': position if position is not None else POS,
        'CMPSUPGAP': 'GAP=35mm' if role == 'LINESTOP' else '0',
    }}


def staged(members):
    return [{'type': 'BRANCH', 'name': LINE, 'children': members}]


def node(name, coords='1032747.41 1991704.95 101100'):
    item = ET.fromstring('<Node><NodeName>' + name + '</NodeName><Position>' +
                         coords + '</Position></Node>')
    return item


def field(element, name):
    return element.findtext(name, '')


def require(condition, message):
    assert condition, message


def run_match(mode, name, content, coords='1032747.41 1991704.95 101100'):
    cfg = config(mode)
    entries = source_entries(content, cfg)
    groups = calibrated_groups([(LINE, node(name, coords))], entries, cfg, field)
    index = _ResolutionIndex(groups, tolerance(cfg))
    return resolve(node(name, coords), LINE, groups, tolerance(cfg), field,
                   require, index, cfg)


class ResolverModesTests(unittest.TestCase):
    def test_pos_uses_datum_on_pos_and_3d_tolerance(self):
        content = staged([member('/SL-1840203.2.1'),
                          member('/SL-1840203.1.2', 'LINESTOP')])
        matched = run_match('POS', '/SL-1840203.2.1', content)
        self.assertEqual(len(matched), 2)
        self.assertEqual(matched[0]['point'], (POS['x'], POS['y'], 101100.0))
        moved = staged([member('/SL-1840203.2.1', position={
            'x': POS['x'] + 6.01, 'y': POS['y'], 'z': POS['z']})])
        self.assertEqual(run_match('POS', '/SL-1840203.2.1', moved), [])

    def test_root_ignores_spatial_matching_and_suffixes(self):
        content = staged([member('/SL-1840203.2.1'),
                          member('/SL-1840203.1.2', 'LINESTOP')])
        matched = run_match('ROOT', '/SL-1840203.1.2', content, '0 0 0')
        self.assertEqual(len(matched), 2)
        self.assertEqual(literal_root('/SL-1840203.1.2'), 'SL-1840203')
        self.assertEqual(match_mode(config('ROOT')), 'ROOT')

    def test_ps_suffix_list(self):
        content = staged([member('/PS1234.1.2', root='PS1234 (REF)'),
                          member('/PS1234-1', 'GUIDE', root='PS1234 (REF)')])
        self.assertEqual(len(run_match('PS', '/PS1234', content, '0 0 0')), 2)
        self.assertEqual(ps_canonical('/PS1234.1.2', ps_suffixes(config('PS'))), 'PS1234')
        self.assertEqual(ps_canonical('/PS1234.1.3', ['.N']), 'PS1234')
        self.assertEqual(ps_canonical('/SL-1840203.1.2', ['.N']), '')

    def test_invalid_suffix_rejected_and_no_cross_branch_root(self):
        self.assertRaises(ValueError, ps_canonical, '/PS1234.1', ['.*'])
        self.assertEqual(literal_root('/SL-1840203.1.2'), 'SL-1840203')


if __name__ == '__main__':
    unittest.main()
