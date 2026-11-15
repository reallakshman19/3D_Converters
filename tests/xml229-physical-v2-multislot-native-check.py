"""Real governed native CII proof: two distinct same-kind GUIDE slots at one node."""
from pathlib import Path
import json
import subprocess
import sys
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
folder=Path(sys.argv[1])
packet=folder/'packet.json'
source=folder/'source.xml'
staged=folder/'staged.json'
config=json.loads((folder/'config.json').read_text(encoding='utf-8'))
cii=folder/'output.cii'
enriched=folder/'enriched.xml'
cmd=[sys.executable,str(ROOT/'converters/scripts/xml_to_cii2019_runtime_custody.py'),
     '--input',str(source),'--staged-json',str(staged),
     '--output',str(cii),'--support-config-json',json.dumps(config),
     '--weight-scale','10','--xml229-native-final-packet',str(packet),
     '--xml229-native-mass-proof',str(folder/'proof.json'),
     '--enriched-output',str(enriched)]
run=subprocess.run(cmd,capture_output=True,text=True,timeout=45,cwd=ROOT)
if run.returncode:
    print(run.stderr,file=sys.stderr)
    raise SystemExit(run.returncode)
root=ET.parse(enriched).getroot()
nodes={int(n.findtext('NodeNumber')):n for n in root.iter('Node')}
gaps=json.loads((folder/'expected-guide-gaps.json').read_text()) if (folder/'expected-guide-gaps.json').exists() else [5,8]
slots=nodes[40].findall('Restraint')
assert len(slots)==len(gaps),len(slots)
assert [(r.findtext('Type'),float(r.findtext('Gap'))) for r in slots]==[('GUI',g) for g in gaps]
assert float(nodes[20].findtext('Weight'))==12.5
text=cii.read_text(encoding='utf-8')
assert '#$ RESTRANT\n' in text
block=text.split('#$ RESTRANT\n',1)[1].split('#$',1)[0].splitlines()
specs=[]
for i in range(0,len(block),4):
    numeric=block[i].split()
    if not numeric: continue
    node_id=int(float(numeric[0]))
    if node_id:
        specs.append((node_id,int(float(numeric[1])),float(numeric[3])))
node40=[row for row in specs if row[0]==40]
assert node40==[(40,8,g) for g in gaps],node40
assert (30,14,7) in specs and (50,9,8) in specs
proof=json.loads((folder/'proof.json').read_text())
assert len(proof['claims'])==1
assert proof['claims'][0]['massKg']==12.5
assert proof['claims'][0]['emittedForceN']==125
print('XML229_V2_TWO_GUIDES_ACTUAL_CII_PASS')
