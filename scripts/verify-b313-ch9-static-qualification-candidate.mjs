import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { evaluateChapterIxStaticQualificationCandidate } from '../converters/b313-chapter-ix/static-qualification-candidate.js';

export function verifyChapterIxStaticQualificationCandidateFile(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return evaluateChapterIxStaticQualificationCandidate(parsed);
}

function exitCode(result) {
  if (!result.ok) return 1;
  return result.candidateState === 'EVIDENCE_COMPLETE_NOT_AUTHORIZED' ? 0 : 2;
}

function main() {
  const [, , filePath] = process.argv;
  if (!filePath) {
    console.error('Usage: node scripts/verify-b313-ch9-static-qualification-candidate.mjs <candidate.json>');
    process.exitCode = 1;
    return;
  }
  try {
    const result = verifyChapterIxStaticQualificationCandidateFile(filePath);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = exitCode(result);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, code: 'CANDIDATE_READ_FAILED', message: error.message }, null, 2));
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
