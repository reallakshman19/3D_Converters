const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '..');

(async () => {
  const mod = await import(pathToFileURL(path.join(root, 'tabs/model-converters/converters/inputxml2019_helper/inputxml-branch-preview.js')).href);

  const defaults = {
    defaultDiameter: 50,
    defaultWallThickness: 0.01,
    defaultInsulationThickness: 0,
    defaultCorrosionAllowance: 0,
    defaultTemperature1: 0,
    defaultTemperature2: 0,
    defaultTemperature3: 0,
  };

  // Empty/unparsable input never throws; returns an empty, ok:false result.
  {
    const result = mod.parseInputXmlForBranchPreview('<Root></Root>', defaults);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.branches.length, 0);
    assert(Array.isArray(result.diagnostics) && result.diagnostics.length > 0);
  }

  const source = `<?xml version="1.0"?><CAESARII XML_TYPE="Input"><PIPINGMODEL>
    <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DIAMETER="219.1" WALL_THICK="8.18">
      <RESTRAINT NUM="1" NODE="20" TYPE="17"/>
      <RESTRAINT NUM="2" NODE="20" TYPE="9"/>
    </PIPINGELEMENT>
    <PIPINGELEMENT FROM_NODE="20" TO_NODE="30" DIAMETER="219.1">
      <RESTRAINT NODE="30" TYPE="1"/>
    </PIPINGELEMENT>
    <PIPINGELEMENT FROM_NODE="100" TO_NODE="110" WALL_THICK="6"></PIPINGELEMENT>
    <PIPINGELEMENT FROM_NODE="200" TO_NODE="210" DIAMETER="100"/>
  </PIPINGMODEL></CAESARII>`;

  // Self-closing PIPINGELEMENT/RESTRAINT tags must not truncate block extraction
  // (a naive non-greedy "open...close" regex would stop at the first nested />).
  {
    const result = mod.parseInputXmlForBranchPreview(source, defaults);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.stats.elementCount, 4, 'all 4 PIPINGELEMENT entries must be found');
    assert.strictEqual(result.stats.restraintCount, 3, 'all 3 nested RESTRAINT entries must be found, including the second one in the first element');
    assert.deepStrictEqual(result.restraints.map((r) => r.type), ['17', '9', '1']);
  }

  // Contiguous FROM/TO chains group into branches; a gap in the node sequence starts a new branch.
  {
    const result = mod.parseInputXmlForBranchPreview(source, defaults);
    assert.strictEqual(result.stats.branchCount, 3);
    assert.strictEqual(result.branches[0].fromNode, '10');
    assert.strictEqual(result.branches[0].toNode, '30');
    assert.strictEqual(result.branches[0].elements.length, 2);
    assert.strictEqual(result.branches[1].fromNode, '100');
    assert.strictEqual(result.branches[2].fromNode, '200');
  }

  // Fields present in the source are marked as not defaulted; missing fields fall back to Tab 2 defaults.
  {
    const result = mod.parseInputXmlForBranchPreview(source, defaults);
    const first = result.elements[0];
    const diameter = first.fields.find((f) => f.key === 'diameter');
    const insulation = first.fields.find((f) => f.key === 'insulationThickness');
    assert.strictEqual(diameter.usedDefault, false);
    assert.strictEqual(diameter.sourceValue, 219.1);
    assert.strictEqual(insulation.usedDefault, true);
    assert.strictEqual(insulation.appliedValue, 0);

    const third = result.elements[2]; // wall_thick present, diameter missing -> falls back to defaultDiameter
    const thirdDiameter = third.fields.find((f) => f.key === 'diameter');
    assert.strictEqual(thirdDiameter.usedDefault, true);
    assert.strictEqual(thirdDiameter.appliedValue, 50);
  }

  console.log('InputXML branch/restraint preview parser checks passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
