/**
 * Validates that migration versions don't exceed the app version.
 * This is a warning, not an error, since app versioning won't always
 * be in the same commit as data versioning.
 */

import * as fs from 'fs';
import * as path from 'path';

// Read app version from client package.json
const clientPackagePath = path.join(__dirname, '..', 'client', 'package.json');
const clientPackage = JSON.parse(fs.readFileSync(clientPackagePath, 'utf-8'));
const appVersion = clientPackage.version;

// Read migration files to extract versions
const migrationsDir = path.join(__dirname, '..', 'client', 'src', 'app', 'migrations');

interface MigrationInfo {
  file: string;
  version: string;
}

/**
 * Compare two semver version strings.
 * @returns negative if a < b, 0 if a === b, positive if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Extract version from migration file content
 */
function extractVersion(content: string): string | null {
  // Match: readonly version = '21.0.0'; or version: '21.0.0'
  const match = content.match(/version\s*[=:]\s*['"](\d+\.\d+\.\d+)['"]/);
  return match ? match[1] : null;
}

/**
 * Main validation function
 */
function validateMigrationVersions(): void {
  /**/console.log('Validating migration versions...\n');
  /**/console.log(`App version: ${appVersion}\n`);

  const migrations: MigrationInfo[] = [];
  const warnings: string[] = [];

  // Read all migration files
  const files = fs.readdirSync(migrationsDir);
  for (const file of files) {
    // Skip non-migration files
    if (!file.endsWith('.migration.ts') || file.includes('.spec.')) {
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const version = extractVersion(content);

    if (version) {
      migrations.push({ file, version });

      if (compareVersions(version, appVersion) > 0) {
        warnings.push(`Migration ${file} (v${version}) exceeds app version (v${appVersion})`);
      }
    }
  }

  // Report migrations found
  /**/console.log(`Found ${migrations.length} migration(s):`);
  for (const migration of migrations.sort((a, b) => compareVersions(a.version, b.version))) {
    const status = compareVersions(migration.version, appVersion) > 0 ? ' [EXCEEDS APP VERSION]' : '';
    /**/console.log(`  ${migration.version} - ${migration.file}${status}`);
  }

  // Report warnings (but don't fail)
  if (warnings.length > 0) {
    /**/console.log('\nWarning: Some migrations exceed the app version:');
    for (const warning of warnings) {
      /**/console.log(`  ${warning}`);
    }
    /**/console.log('\nNote: These migrations will be skipped until the app version is updated.');
    /**/console.log('This is expected during development when data migrations are committed before app version bumps.\n');
  } else {
    /**/console.log('\nAll migration versions are valid.\n');
  }
}

// Run validation
try {
  validateMigrationVersions();
} catch (error) {
  console.error('Error during migration version validation:', error);
  process.exit(1);
}
