"""Owner rule 17 Nov 2026 (BM2): blind-flange weight onto the flange before it; a flange weight on both ends once.
Runs the actual parser/model/writer CLI on small XMLs shaped like the BM2 cases."""
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
WRITER = ROOT / "converters/scripts/xml_to_cii2019_runtime_custody.py"


def node(number, y, weight=0, rigid="", component="PIPE", ref=None, endpoint=2):
    return (f"<Node><NodeNumber>{number}</NodeNumber><Position>0 {y} 0</Position>"
            f"<Endpoint>{endpoint}</Endpoint><ComponentType>{component}</ComponentType>"
            f"<ComponentRefNo>{ref or f'REF{number}'}</ComponentRefNo><Rigid>{rigid}</Rigid>"
            f"<Weight>{weight}</Weight><OutsideDiameter>60.3</OutsideDiameter><WallThickness>3.9</WallThickness></Node>")


def run(folder, nodes):
    source = folder / "source.xml"
    source.write_text("<PipeStressExport xmlns='http://aveva.com/pipeStress116.xsd'>"
                      "<Pipe><Branch><Branchname>/B1</Branchname>" + nodes
                      + "</Branch></Pipe></PipeStressExport>", encoding="utf-8")
    out = folder / "result.cii"
    out.unlink(missing_ok=True)
    done = subprocess.run([sys.executable, str(WRITER), "--input", str(source), "--output", str(out),
                           "--weight-scale", "10"], capture_output=True, text=True)
    rigids = None
    if done.returncode == 0:
        payload = out.read_text().split("#$ RIGID", 1)[1].split("#$", 1)[0]
        rigids = [float(line.split()[0]) for line in payload.splitlines() if line.strip()]
    return done, rigids


def blind(gap=3.2, with_fbli=True, weight=17.499):
    # As in BM2 P4110008/B4: the blind is one FBLI end-1 node and a weighted RIGID at the same point.
    fbli = node(-1, 209 + gap, 0, "", "FBLI", "BLIND", 1) if with_fbli else ""
    return (node(10, 0) + node(20, 100) + node(30, 100, 0, "1", "FLAN", "FL", 1) + node(39, 209, 17, "2", "FLAN", "FL", 2)
            + fbli + node(40, 209 + gap, weight, "2", "RIGID", "BLIND", 2) + node(50, 182.2, 0, "", "BRAN", "BR", 2))


with tempfile.TemporaryDirectory() as directory:
    folder = Path(directory)
    done, rigids = run(folder, blind())
    assert done.returncode == 0, done.stderr[-800:]
    assert rigids == [344.99], rigids
    assert "CII_WEIGHT_RULE blind-flange-weight-on-flange /B1::40 17.499 kg -> CII element 20-39" in done.stdout, [l for l in done.stdout.splitlines() if "RULE" in l]

    for case in (blind(with_fbli=False), blind(gap=8.0)):
        done, rigids = run(folder, case)
        if done.returncode == 0:
            assert rigids != [344.99], "no blind between, or too far: the weight must not move to the flange"
        else:
            assert "CII_WEIGHT_OWNER_UNRESOLVED" in done.stderr, done.stderr[-800:]

    # Same flange weight on both ends, end 2 rigid: written once on the flange element.
    both = (node(10, 0) + node(20, 100) + node(30, 100, 29, "2", "FLAN", "FL", 1) + node(39, 221, 29, "2", "FLAN", "FL", 2)
            + node(50, 400))
    done, rigids = run(folder, both)
    assert done.returncode == 0, done.stderr[-800:]
    assert rigids == [290.0], rigids

    # Different weights on the two ends are not a duplicate: still refused.
    done, _ = run(folder, both.replace("<Weight>29</Weight>", "<Weight>31</Weight>", 1))
    assert done.returncode != 0 and "CII_WEIGHT_OWNER_UNRESOLVED" in done.stderr, done.stderr[-800:]
print("PASS: blind-flange weight onto the flange before it; flange weight on both ends once; others still refused")
