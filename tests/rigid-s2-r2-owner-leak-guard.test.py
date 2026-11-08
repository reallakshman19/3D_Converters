"""Fail-closed CI guard against recommitting protected Owner-derived R9 data.

Only the current tracked tests/ tree is scanned; historical Git objects remain
reachable under the Owner's explicit no-history-rewrite ruling. No raw protected
bytes are printed or persisted by this guard.
"""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
OLD_PATH = "tests/fixtures/rigid-s2-r1-derived-native-geometry.xml"
BASE = "1729089c90673ad30b34f0a648366aa8f5fbec6d"


class ProtectedSourceLeak(AssertionError):
    pass


def signatures():
    return {
        # Match the Owner R9 *branch-name shape*, not unrelated zone labels
        # such as /GLRD-1000-CU-PI-P used by independent FBX tests.
        "OWNER_BRANCH_2": b"/" + b"GL" + b'RD-1000-2"-',
        "OWNER_BRANCH_6": b"/" + b"GL" + b'RD-1000-6"-',
        "OWNER_XML_SHA": ("5cf2bfbe4cbe88361" + "afcb3374c5230ee4" +
                          "badf42d9f503ec2c" + "b5b2f0b7414e00c").encode(),
        "OWNER_XML_SIZE": str(680000 + 7252).encode(),
    }


def check_bytes(filename, data):
    for name, marker in signatures().items():
        if marker in data:
            raise ProtectedSourceLeak(
                f"S2_R9_PROTECTED_CONTENT:{name}:{Path(filename).name}")
    return True


def check_tracked_tests(root=ROOT):
    names = subprocess.check_output(
        ["git", "ls-files", "-z", "--", "tests/"], cwd=root).split(b"\0")
    count = 0
    for name in names:
        if not name:
            continue
        path = root / name.decode("utf-8")
        if not path.is_file():
            raise ProtectedSourceLeak("S2_TRACKED_TEST_FILE_MISSING")
        check_bytes(path, path.read_bytes())
        count += 1
    if count == 0:
        raise ProtectedSourceLeak("S2_NO_TRACKED_TESTS_TO_SCAN")
    print(f"S2_R2_OWNER_SOURCE_CONTENT_GUARD_PASS tracked_tests={count}",
          flush=True)
    return True


class OwnerSourceContentGuards(unittest.TestCase):
    def test_p2_old_public_fixture_from_git_history_is_rejected(self):
        # Historical object is read only in-memory. Never recommit or upload it.
        try:
            old = subprocess.check_output(
                ["git", "show", BASE + ":" + OLD_PATH],
                cwd=ROOT, stderr=subprocess.DEVNULL)
        except (subprocess.CalledProcessError, FileNotFoundError):
            self.skipTest("P2_HISTORY_TEST_SKIP: full Git history unavailable locally")
        self.assertGreater(len(old), 400000)
        with self.assertRaisesRegex(ProtectedSourceLeak,
                                    "S2_R9_PROTECTED_CONTENT:OWNER_BRANCH"):
            check_bytes(OLD_PATH, old)

    def test_p2_readded_owner_branch_marker_rejected(self):
        marker = b"<Branchname>/" + b"GL" + b'RD-1000-2"-SYNTHETIC</Branchname>'
        with self.assertRaisesRegex(ProtectedSourceLeak, "OWNER_BRANCH"):
            check_bytes("reintroduced.xml", marker)

    def test_p2_owner_checksum_and_size_markers_rejected(self):
        for name in ("OWNER_XML_SHA", "OWNER_XML_SIZE"):
            with self.subTest(name=name):
                with self.assertRaisesRegex(ProtectedSourceLeak, name):
                    check_bytes("reintroduced-ledger.json", signatures()[name])

    def test_p2_synthetic_text_is_allowed(self):
        self.assertTrue(check_bytes("synthetic.xml", b"<Branchname>SYNTH-LAB</Branchname>"))
        # Unrelated FBX test zone labels are not R9 XML branch names.
        self.assertTrue(check_bytes("fbx-test.mjs", b"zoneLabel: '/GL" + b"RD-1000-CU-PI-P'"))


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--guard":
        try:
            check_tracked_tests()
        except ProtectedSourceLeak as err:
            print(str(err), file=sys.stderr)
            sys.exit(1)
    else:
        unittest.main()
