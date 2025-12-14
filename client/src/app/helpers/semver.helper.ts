/**
 * Semantic versioning utilities.
 *
 * Provides parsing, comparison, and diff calculation for semver strings.
 * Regex sourced from semver.org official specification.
 */

/**
 * Official semver regex from semver.org.
 * Captures: major, minor, patch, prerelease (optional), build metadata (optional)
 */
export const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Parsed semver components.
 */
export interface ParsedSemver {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

/**
 * Semver comparison result with impact level and direction.
 */
export interface SemverDiff {
  /** Which component differs most significantly */
  impact: 'major' | 'minor' | 'patch' | 'none';
  /** Absolute difference in the impacted component */
  delta: number;
  /** Direction of the difference */
  direction: 'ahead' | 'behind' | 'same';
}

/**
 * Check if a string is a valid semver.
 */
export function isValidSemver(version: string): boolean {
  return SEMVER_REGEX.test(version);
}

/**
 * Parse a semver string into components.
 * Returns null if invalid.
 */
export function parseSemver(version: string): ParsedSemver | null {
  const match = SEMVER_REGEX.exec(version);
  if (!match) return null;

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
    prerelease: match[4],
    build: match[5],
  };
}

/**
 * Compare two semver strings.
 * @returns negative if a < b, 0 if a === b, positive if a > b
 */
export function compareSemver(a: string, b: string): number {
  const parsedA = parseSemver(a);
  const parsedB = parseSemver(b);

  // Invalid versions sort last
  if (!parsedA && !parsedB) return 0;
  if (!parsedA) return 1;
  if (!parsedB) return -1;

  // Compare major.minor.patch
  const majorDiff = parsedA.major - parsedB.major;
  if (majorDiff !== 0) return majorDiff;

  const minorDiff = parsedA.minor - parsedB.minor;
  if (minorDiff !== 0) return minorDiff;

  const patchDiff = parsedA.patch - parsedB.patch;
  if (patchDiff !== 0) return patchDiff;

  // Prerelease versions have lower precedence than normal
  // 1.0.0-alpha < 1.0.0
  if (parsedA.prerelease && !parsedB.prerelease) return -1;
  if (!parsedA.prerelease && parsedB.prerelease) return 1;

  // Both have prerelease - compare lexically (simplified)
  if (parsedA.prerelease && parsedB.prerelease) {
    return parsedA.prerelease.localeCompare(parsedB.prerelease);
  }

  return 0;
}

/**
 * Calculate the semantic version difference between two versions.
 *
 * @param current - The current/local version
 * @param target - The target/remote version to compare against
 * @returns Diff object with impact level, delta, and direction
 *
 * @example
 * semverDiff('1.0.0', '1.2.0') // { impact: 'minor', delta: 2, direction: 'behind' }
 * semverDiff('2.0.0', '1.0.0') // { impact: 'major', delta: 1, direction: 'ahead' }
 * semverDiff('1.0.0', '1.0.0') // { impact: 'none', delta: 0, direction: 'same' }
 */
export function semverDiff(current: string, target: string): SemverDiff {
  const cur = parseSemver(current);
  const tgt = parseSemver(target);

  // If either is invalid, return no difference
  if (!cur || !tgt) {
    return { impact: 'none', delta: 0, direction: 'same' };
  }

  // Check major
  if (cur.major !== tgt.major) {
    const delta = Math.abs(cur.major - tgt.major);
    const direction = cur.major < tgt.major ? 'behind' : 'ahead';
    return { impact: 'major', delta, direction };
  }

  // Check minor
  if (cur.minor !== tgt.minor) {
    const delta = Math.abs(cur.minor - tgt.minor);
    const direction = cur.minor < tgt.minor ? 'behind' : 'ahead';
    return { impact: 'minor', delta, direction };
  }

  // Check patch
  if (cur.patch !== tgt.patch) {
    const delta = Math.abs(cur.patch - tgt.patch);
    const direction = cur.patch < tgt.patch ? 'behind' : 'ahead';
    return { impact: 'patch', delta, direction };
  }

  return { impact: 'none', delta: 0, direction: 'same' };
}
