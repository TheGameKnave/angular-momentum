import {
  SEMVER_REGEX,
  isValidSemver,
  parseSemver,
  compareSemver,
  semverDiff,
  ParsedSemver,
  SemverDiff,
} from './semver.helper';

describe('semver.helper', () => {
  describe('SEMVER_REGEX', () => {
    it('should match valid semver strings', () => {
      expect(SEMVER_REGEX.test('1.0.0')).toBeTrue();
      expect(SEMVER_REGEX.test('0.0.0')).toBeTrue();
      expect(SEMVER_REGEX.test('21.5.3')).toBeTrue();
      expect(SEMVER_REGEX.test('1.0.0-alpha')).toBeTrue();
      expect(SEMVER_REGEX.test('1.0.0-alpha.1')).toBeTrue();
      expect(SEMVER_REGEX.test('1.0.0+build')).toBeTrue();
      expect(SEMVER_REGEX.test('1.0.0-alpha+build')).toBeTrue();
    });

    it('should not match invalid semver strings', () => {
      expect(SEMVER_REGEX.test('1.0')).toBeFalse();
      expect(SEMVER_REGEX.test('1')).toBeFalse();
      expect(SEMVER_REGEX.test('v1.0.0')).toBeFalse();
      expect(SEMVER_REGEX.test('1.0.0.0')).toBeFalse();
      expect(SEMVER_REGEX.test('abc')).toBeFalse();
    });
  });

  describe('isValidSemver', () => {
    it('should return true for valid semver', () => {
      expect(isValidSemver('1.0.0')).toBeTrue();
      expect(isValidSemver('0.1.0')).toBeTrue();
      expect(isValidSemver('1.0.0-beta')).toBeTrue();
    });

    it('should return false for invalid semver', () => {
      expect(isValidSemver('invalid')).toBeFalse();
      expect(isValidSemver('1.0')).toBeFalse();
      expect(isValidSemver('')).toBeFalse();
    });
  });

  describe('parseSemver', () => {
    it('should parse valid semver strings', () => {
      const result = parseSemver('1.2.3');
      expect(result).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        build: undefined,
      });
    });

    it('should parse semver with prerelease', () => {
      const result = parseSemver('1.0.0-alpha.1');
      expect(result).toEqual({
        major: 1,
        minor: 0,
        patch: 0,
        prerelease: 'alpha.1',
        build: undefined,
      });
    });

    it('should parse semver with build metadata', () => {
      const result = parseSemver('1.0.0+build.123');
      expect(result).toEqual({
        major: 1,
        minor: 0,
        patch: 0,
        prerelease: undefined,
        build: 'build.123',
      });
    });

    it('should parse semver with prerelease and build', () => {
      const result = parseSemver('1.0.0-beta.2+build.456');
      expect(result).toEqual({
        major: 1,
        minor: 0,
        patch: 0,
        prerelease: 'beta.2',
        build: 'build.456',
      });
    });

    it('should return null for invalid semver', () => {
      expect(parseSemver('invalid')).toBeNull();
      expect(parseSemver('1.0')).toBeNull();
      expect(parseSemver('')).toBeNull();
    });
  });

  describe('compareSemver', () => {
    it('should return 0 for equal versions', () => {
      expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
      expect(compareSemver('21.5.3', '21.5.3')).toBe(0);
    });

    it('should compare major versions', () => {
      expect(compareSemver('2.0.0', '1.0.0')).toBeGreaterThan(0);
      expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0);
    });

    it('should compare minor versions', () => {
      expect(compareSemver('1.2.0', '1.1.0')).toBeGreaterThan(0);
      expect(compareSemver('1.1.0', '1.2.0')).toBeLessThan(0);
    });

    it('should compare patch versions', () => {
      expect(compareSemver('1.0.2', '1.0.1')).toBeGreaterThan(0);
      expect(compareSemver('1.0.1', '1.0.2')).toBeLessThan(0);
    });

    it('should handle prerelease versions (prerelease < release)', () => {
      expect(compareSemver('1.0.0-alpha', '1.0.0')).toBeLessThan(0);
      expect(compareSemver('1.0.0', '1.0.0-alpha')).toBeGreaterThan(0);
    });

    it('should compare prerelease versions lexically', () => {
      expect(compareSemver('1.0.0-alpha', '1.0.0-beta')).toBeLessThan(0);
      expect(compareSemver('1.0.0-beta', '1.0.0-alpha')).toBeGreaterThan(0);
      expect(compareSemver('1.0.0-alpha', '1.0.0-alpha')).toBe(0);
    });

    it('should return 0 for two invalid versions', () => {
      expect(compareSemver('invalid', 'alsoinvalid')).toBe(0);
    });

    it('should sort invalid versions last', () => {
      expect(compareSemver('invalid', '1.0.0')).toBeGreaterThan(0);
      expect(compareSemver('1.0.0', 'invalid')).toBeLessThan(0);
    });
  });

  describe('semverDiff', () => {
    it('should return none for equal versions', () => {
      const result = semverDiff('1.0.0', '1.0.0');
      expect(result).toEqual({ impact: 'none', delta: 0, direction: 'same' });
    });

    it('should detect major version behind', () => {
      const result = semverDiff('1.0.0', '2.0.0');
      expect(result).toEqual({ impact: 'major', delta: 1, direction: 'behind' });
    });

    it('should detect major version ahead', () => {
      const result = semverDiff('3.0.0', '1.0.0');
      expect(result).toEqual({ impact: 'major', delta: 2, direction: 'ahead' });
    });

    it('should detect minor version behind', () => {
      const result = semverDiff('1.0.0', '1.2.0');
      expect(result).toEqual({ impact: 'minor', delta: 2, direction: 'behind' });
    });

    it('should detect minor version ahead', () => {
      const result = semverDiff('1.5.0', '1.3.0');
      expect(result).toEqual({ impact: 'minor', delta: 2, direction: 'ahead' });
    });

    it('should detect patch version behind', () => {
      const result = semverDiff('1.0.0', '1.0.5');
      expect(result).toEqual({ impact: 'patch', delta: 5, direction: 'behind' });
    });

    it('should detect patch version ahead', () => {
      const result = semverDiff('1.0.10', '1.0.3');
      expect(result).toEqual({ impact: 'patch', delta: 7, direction: 'ahead' });
    });

    it('should return none for invalid versions', () => {
      expect(semverDiff('invalid', '1.0.0')).toEqual({ impact: 'none', delta: 0, direction: 'same' });
      expect(semverDiff('1.0.0', 'invalid')).toEqual({ impact: 'none', delta: 0, direction: 'same' });
      expect(semverDiff('invalid', 'alsoinvalid')).toEqual({ impact: 'none', delta: 0, direction: 'same' });
    });
  });
});
