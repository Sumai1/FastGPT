import { describe, it, expect } from 'vitest';
import { searchErrorCodes, ERROR_CODES_DATABASE } from '../../src/components/ErrorCodeQuickSearch';

describe('Error Code Search Engine & Fuzzy Matching', () => {
  it('should match normalized error codes regardless of casing or hyphens', () => {
    // E-01
    const res1 = searchErrorCodes('e01');
    expect(res1.length).toBeGreaterThanOrEqual(1);
    expect(res1[0].code).toBe('E-01');

    const res2 = searchErrorCodes('E-01');
    expect(res2[0].code).toBe('E-01');

    // V-101
    const res3 = searchErrorCodes('v101');
    expect(res3[0].code).toBe('V-101');

    // ERR-NET
    const res4 = searchErrorCodes('errnet');
    expect(res4[0].code).toBe('ERR-NET');

    // ERR-PWR
    const res5 = searchErrorCodes('errpwr');
    expect(res5[0].code).toBe('ERR-PWR');
  });

  it('should match fuzzy keywords across fault name and resolution', () => {
    const jamRes = searchErrorCodes('卡纸');
    expect(jamRes.some((item) => item.code === 'E-01')).toBe(true);

    const tempRes = searchErrorCodes('温控');
    expect(tempRes.some((item) => item.code === 'V-201')).toBe(true);

    const motorRes = searchErrorCodes('堵转');
    expect(motorRes.some((item) => item.code === 'V-101')).toBe(true);

    const netRes = searchErrorCodes('通信');
    expect(netRes.some((item) => item.code === 'ERR-NET')).toBe(true);
  });

  it('should return all required error code entries across zones', () => {
    const codes = ERROR_CODES_DATABASE.map((c) => c.code);
    expect(codes).toContain('E-01');
    expect(codes).toContain('E-02');
    expect(codes).toContain('E-03');
    expect(codes).toContain('E-05');
    expect(codes).toContain('E-08');
    expect(codes).toContain('E-12');
    expect(codes).toContain('V-101');
    expect(codes).toContain('V-102');
    expect(codes).toContain('V-201');
    expect(codes).toContain('V-205');
    expect(codes).toContain('V-301');
    expect(codes).toContain('V-305');
    expect(codes).toContain('ERR-NET');
    expect(codes).toContain('ERR-PWR');
  });

  it('should return empty array for empty search queries', () => {
    expect(searchErrorCodes('')).toEqual([]);
    expect(searchErrorCodes('   ')).toEqual([]);
  });
});
