import { getCallDateTimeISO } from '../../../lib/utils/time-utils.test';

// Mock console.log to avoid noise in tests
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});

describe('getCallDateTimeISO', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return current time when no date is provided', () => {
    const result = getCallDateTimeISO(undefined, undefined);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should return current time when empty date is provided', () => {
    const result = getCallDateTimeISO('', undefined);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should return current time when whitespace date is provided', () => {
    const result = getCallDateTimeISO('   ', undefined);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should handle invalid date format gracefully', () => {
    const result = getCallDateTimeISO('invalid-date', '12:30');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should parse mm/dd/yyyy date format correctly', () => {
    const result = getCallDateTimeISO('11/19/2025', '14:30');
    const date = new Date(result);
    expect(date.getUTCFullYear()).toBe(2025);
    expect(date.getUTCMonth()).toBe(10); // November (0-indexed)
    expect(date.getUTCDate()).toBe(19);
    expect(date.getUTCHours()).toBe(13); // 14:30 local becomes 13:30 UTC (assuming UTC+1)
    expect(date.getUTCMinutes()).toBe(30);
  });

  it('should handle time parsing correctly', () => {
    const result = getCallDateTimeISO('11/19/2025', '09:15');
    const date = new Date(result);
    expect(date.getUTCHours()).toBe(8); // 09:15 local becomes 08:15 UTC
    expect(date.getUTCMinutes()).toBe(15);
  });

  it('should handle midnight time correctly', () => {
    const result = getCallDateTimeISO('11/19/2025', '00:00');
    const date = new Date(result);
    expect(date.getUTCHours()).toBe(23); // 00:00 local becomes 23:00 UTC previous day
    expect(date.getUTCMinutes()).toBe(0);
  });

  it('should handle noon time correctly', () => {
    const result = getCallDateTimeISO('11/19/2025', '12:00');
    const date = new Date(result);
    expect(date.getUTCHours()).toBe(11); // 12:00 local becomes 11:00 UTC
    expect(date.getUTCMinutes()).toBe(0);
  });

  it('should use current time when no time is provided', () => {
    const before = new Date();
    const result = getCallDateTimeISO('11/19/2025', undefined);
    const after = new Date();

    const resultDate = new Date(result);
    expect(resultDate.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(resultDate.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
  });

  it('should use current time when empty time is provided', () => {
    const before = new Date();
    const result = getCallDateTimeISO('11/19/2025', '');
    const after = new Date();

    const resultDate = new Date(result);
    expect(resultDate.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(resultDate.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
  });

  it('should use current time when whitespace time is provided', () => {
    const before = new Date();
    const result = getCallDateTimeISO('11/19/2025', '   ');
    const after = new Date();

    const resultDate = new Date(result);
    expect(resultDate.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(resultDate.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
  });

  it('should handle invalid time format gracefully', () => {
    const result = getCallDateTimeISO('11/19/2025', 'invalid-time');
    const date = new Date(result);
    // Should use current time
    const now = new Date();
    expect(date.getUTCHours()).toBe(now.getUTCHours());
    expect(date.getUTCMinutes()).toBe(now.getUTCMinutes());
  });

  it('should handle time with single digit hours', () => {
    const result = getCallDateTimeISO('11/19/2025', '9:30');
    const date = new Date(result);
    expect(date.getUTCHours()).toBe(8); // 9:30 local becomes 8:30 UTC
    expect(date.getUTCMinutes()).toBe(30);
  });

  it('should handle time with single digit minutes', () => {
    const result = getCallDateTimeISO('11/19/2025', '14:5');
    const date = new Date(result);
    expect(date.getUTCHours()).toBe(13); // 14:05 local becomes 13:05 UTC
    expect(date.getUTCMinutes()).toBe(5);
  });

  it('should reject invalid hours', () => {
    const result = getCallDateTimeISO('11/19/2025', '25:30');
    const date = new Date(result);
    // Should use current time
    const now = new Date();
    expect(date.getUTCHours()).toBe(now.getUTCHours());
    expect(date.getUTCMinutes()).toBe(now.getUTCMinutes());
  });

  it('should reject invalid minutes', () => {
    const result = getCallDateTimeISO('11/19/2025', '14:60');
    const date = new Date(result);
    // Should use current time
    const now = new Date();
    expect(date.getUTCHours()).toBe(now.getUTCHours());
    expect(date.getUTCMinutes()).toBe(now.getUTCMinutes());
  });

  it('should handle edge case: 23:59', () => {
    const result = getCallDateTimeISO('11/19/2025', '23:59');
    const date = new Date(result);
    expect(date.getUTCHours()).toBe(22); // 23:59 local becomes 22:59 UTC
    expect(date.getUTCMinutes()).toBe(59);
  });

  it('should handle edge case: 00:01', () => {
    const result = getCallDateTimeISO('11/19/2025', '00:01');
    const date = new Date(result);
    expect(date.getUTCHours()).toBe(23); // 00:01 local becomes 23:01 UTC previous day
    expect(date.getUTCMinutes()).toBe(1);
  });
});