// Validates that all istanbul ignore comments include justifications.
//
// Valid formats:
// - // istanbul ignore next - justification here
// - // istanbul ignore next: justification here
//
// Invalid (missing justification):
// - // istanbul ignore next
// - // istanbul ignore next //

import * as fs from 'fs';
import * as path from 'path';

interface Violation {
  file: string;
  line: number;
  content: string;
}

/**
 * Recursively find all TypeScript files in a directory (excluding spec files).
 * @param dir - Directory to search
 * @returns Array of file paths
 */
function findTsFiles(dir: string): string[] {
  const files: string[] = [];

  /**
   * Recursively walk directory tree.
   * @param currentDir - Current directory being walked
   */
  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') {
          walk(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Find all istanbul ignore comments without justifications.
 * @returns Array of violations with file, line, and content
 */
function findViolations(): Violation[] {
  const violations: Violation[] = [];

  // Find all TypeScript files in client/src (excluding spec files)
  // Resolve path relative to this script's location (tests/)
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const clientSrcDir = path.resolve(scriptDir, '../client/src');
  const files = findTsFiles(clientSrcDir);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for istanbul ignore comments
      if (line.includes('istanbul ignore')) {
        // Valid patterns: must have " - " or ": " followed by text after "istanbul ignore next/if"
        const hasJustification =
          /istanbul ignore (next|if)\s*[-:]\s*\S/.test(line) ||
          /istanbul ignore (next|if)\s*\/\/\s*\S/.test(line);

        if (!hasJustification) {
          violations.push({
            file,
            line: index + 1,
            content: line.trim(),
          });
        }
      }
    });
  }

  return violations;
}

/**
 * Main entry point - check for violations and exit with appropriate code.
 */
function main(): void {
  /**/console.log('Checking for istanbul ignore comments without justifications...\n');

  const violations = findViolations();

  if (violations.length === 0) {
    /**/console.log('✓ All istanbul ignore comments have justifications');
    process.exit(0);
  } else {
    console.error(`✗ Found ${violations.length} istanbul ignore comment(s) without justification:\n`);

    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}`);
      console.error(`    ${v.content}\n`);
    }

    console.error('Add a justification after the comment, e.g.:');
    console.error('  // istanbul ignore next - SSR guard, document always exists in browser tests');

    process.exit(1);
  }
}

main();
