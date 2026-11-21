import { expect, it } from 'vitest';
import { pct } from './format';

it('rounds percentages down', () => {
  expect(pct(99.5)).toBe('99');
  expect(pct(100)).toBe('100');
  expect(pct(99.96, 1)).toBe('99.9');
  expect(pct(57.0, 1)).toBe('57.0');
});
