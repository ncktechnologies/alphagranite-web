import { describe, expect, it } from 'vitest';
import { deltaToneClass, formatCurrency, formatMetric, formatSignedCurrency } from './report-format';

describe('formatSignedCurrency (Gross Profit Delta)', () => {
  it('uses a minus sign, never accounting brackets', () => {
    expect(formatSignedCurrency(-645000)).toBe('-$645,000');
    expect(formatSignedCurrency(-645000)).not.toContain('(');
  });

  it('shows a plus sign for positive values', () => {
    expect(formatSignedCurrency(50000)).toBe('+$50,000');
  });

  it('shows zero without a sign', () => {
    expect(formatSignedCurrency(0)).toBe('$0');
  });

  it('supports cents and blanks', () => {
    expect(formatSignedCurrency(-1234.5, 2)).toBe('-$1,234.50');
    expect(formatSignedCurrency(null)).toBe('-');
  });
});

describe('deltaToneClass', () => {
  it('is red when negative', () => {
    expect(deltaToneClass(-1)).toBe('text-destructive');
  });

  it('is the regular (black) text color when positive or zero', () => {
    expect(deltaToneClass(1)).toBe('text-foreground');
    expect(deltaToneClass(0)).toBe('text-foreground');
  });

  it('is not red when there is no value', () => {
    expect(deltaToneClass(null)).toBe('text-foreground');
  });
});

describe('formatCurrency', () => {
  it('puts the minus sign before the dollar sign', () => {
    expect(formatCurrency(-12.5)).toBe('-$12.50');
    expect(formatCurrency(1234567.891)).toBe('$1,234,567.89');
  });

  it('renders blanks as a dash', () => {
    expect(formatCurrency(undefined)).toBe('-');
    expect(formatCurrency('')).toBe('-');
  });
});

describe('formatMetric (matches the backend PDF formatter)', () => {
  it.each([
    [-645000, 'currency', '-$645,000.00'],
    [1234.5, 'currency', '$1,234.50'],
    [12.345, 'percent', '12.35%'],
    [4, 'count', '4.0'],
    [7, 'days', '7'],
    [1954, 'number', '1,954.00'],
    [null, 'currency', '-'],
  ])('formats %s as %s', (value, format, expected) => {
    expect(formatMetric(value, format)).toBe(expected);
  });
});
