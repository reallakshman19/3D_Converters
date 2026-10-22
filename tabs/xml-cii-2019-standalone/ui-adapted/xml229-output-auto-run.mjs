/**
 * XML229 Output Auto-Run Controller.
 * Automates native CII conversion execution when JSON-governed engineering
 * weights are verified and ready on Tab 5 (Run).
 *
 * Checks eligibility, manages single-execution tracking per GC-PW Worker session,
 * and schedules execution via microtask so UI rendering completes cleanly.
 */
import { getXml229CurrentWorkerHeldReview } from './xml-cii-adapted-p4-verified-weight-panel.js';

// One automatic execution per verified GC-PW Worker session across re-renders.
const xml229AutoRunSessions = new WeakSet();

export function isXml229AutoRunEligible({ governed, weightsReady, blocked, state, session }) {
  return governed === true && weightsReady === true && !blocked && !state?.running &&
    !state?.result?.ok && !!session && !session.closed &&
    !xml229AutoRunSessions.has(session);
}

export function recordXml229AutoRunAttempted(session) {
  if (session) xml229AutoRunSessions.add(session);
}

export function scheduleXml229AutoRun({
  stateRef, render, governed, weightsReady, blocked, finalizeBtn, executeXml229NativeRun, session: explicitSession,
}) {
  const state = stateRef?.current;
  const session = explicitSession || getXml229CurrentWorkerHeldReview(stateRef);
  if (!isXml229AutoRunEligible({ governed, weightsReady, blocked, state, session })) return;
  recordXml229AutoRunAttempted(session);
  queueMicrotask(() => {
    if (finalizeBtn && finalizeBtn.isConnected === false) return;
    if (finalizeBtn && finalizeBtn.disabled) return;
    if (typeof executeXml229NativeRun === 'function') {
      void executeXml229NativeRun({ stateRef, render, finalizeBtn });
    }
  });
}
