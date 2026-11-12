// __CARD_ID__ engine. Pure: bytes in, result out. No DOM, no fs, no network.
// Throw refusals with refuse()/require(); callers wrap with attempt() for all-or-nothing results.
import { require } from '../kit/core.mjs';

/** Example engine step. Replace with the card's functions. */
export function run(bytes) {
  require(bytes && bytes.length > 0, '__CARD_PREFIX___EMPTY_INPUT', 'input');
  return { bytes: bytes.length };
}
