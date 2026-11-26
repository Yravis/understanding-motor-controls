import { describe, it, expect } from 'vitest';
import { params } from './helpers';
import { faultDefs } from '../src/model/faults';
import { healthyReadings, faultReadings } from '../src/model/readings';

// Snapshot of the review-sheet readings tables: any code change that shifts a reading shows up as a diff
// that the reviewer must re-approve.
describe('readings snapshots (review sheets)', () => {
  it('healthy bucket', () => expect(healthyReadings(params)).toMatchSnapshot());
  for (const f of faultDefs(params)) it(`fault ${f.id}`, () => expect(faultReadings(params, f)).toMatchSnapshot());
});
