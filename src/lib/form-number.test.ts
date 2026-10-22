import { describe, expect, it } from 'vitest';
import { inputToNumber, numberToInput } from './form-number';

describe('numberToInput', () => {
  it('keeps 0 and leaves missing values blank', () => {
    expect(numberToInput(0)).toBe('0');
    expect(numberToInput(12.5)).toBe('12.5');
    expect(numberToInput('7')).toBe('7');
    expect(numberToInput(null)).toBe('');
    expect(numberToInput(undefined)).toBe('');
    expect(numberToInput('')).toBe('');
  });
});

describe('inputToNumber', () => {
  it('keeps 0 and turns blank or junk into null', () => {
    expect(inputToNumber('0')).toBe(0);
    expect(inputToNumber(' 0.00 ')).toBe(0);
    expect(inputToNumber('1234.56')).toBe(1234.56);
    expect(inputToNumber('')).toBeNull();
    expect(inputToNumber('   ')).toBeNull();
    expect(inputToNumber(undefined)).toBeNull();
    expect(inputToNumber('abc')).toBeNull();
  });

  it('round-trips a stored 0 unchanged', () => {
    expect(inputToNumber(numberToInput(0))).toBe(0);
    expect(inputToNumber(numberToInput(null))).toBeNull();
  });
});
