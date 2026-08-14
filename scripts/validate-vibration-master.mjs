import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateVibrationMaster } from '../converters/vibration/masters/index.js';

function usage() {
  return 'Usage: node scripts/validate-vibration-master.mjs <master.json>';
}

export async function validateVibrationMasterFile(filePath) {
  if (!filePath) throw new TypeError('VIBRATION_MASTER_FILE_REQUIRED');
  const absolutePath = resolve(filePath);
  const parsed = JSON.parse(await readFile(absolutePath, 'utf8'));
  const master = await validateVibrationMaster(parsed);
  return Object.freeze({
    schema: 'VibrationMasterValidationReceipt.v1',
    path: absolutePath,
    masterId: master.masterId,
    revision: master.revision,
    publicationState: master.publicationState,
    contentHash: master.contentHash,
    sourceGitBlob: master.source.gitBlobSha1,
    sourceLocator: master.source.locator,
  });
}

async function main(args) {
  if (args.length !== 1) throw new TypeError(usage());
  const receipt = await validateVibrationMasterFile(args[0]);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}

const invoked = process.argv[1] ? resolve(process.argv[1]) : null;
if (invoked === resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error?.message || error}\n`);
    process.exitCode = 1;
  });
}
