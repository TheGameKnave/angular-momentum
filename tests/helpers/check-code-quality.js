#!/usr/bin/env node

/**
 * Pre-commit code quality checker
 * Checks for:
 * 1. console.log statements in TypeScript files
 * 2. Functions without JSDoc comments
 */

const fs = require('fs');

let hasErrors = false;

/**
 * Checks a TypeScript file for code quality issues
 * @param {string} filePath - Path to the file to check
 */
function checkFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  console.log(`\n🔍 Checking: ${filePath}`);

  // Check for console.log statements
  const consoleLogLines = [];
  lines.forEach((line, index) => {
    if (/console\.(log|debug)/.test(line) &&
        !line.trim().startsWith('//') &&
        !line.includes('/**/console')) { // Allow /**/console pattern
      consoleLogLines.push({ line: index + 1, content: line.trim() });
    }
  });

  if (consoleLogLines.length > 0) {
    console.error(`  ❌ ERROR: Found ${consoleLogLines.length} console.log statement(s):`);
    consoleLogLines.forEach(({ line, content }) => {
      console.error(`     Line ${line}: ${content}`);
    });
    console.error(`     Tip: Use LogService for environment-aware logging`);
    hasErrors = true;
  }

  // Check for classes and functions without JSDoc
  const classPattern = /^\s*(export\s+)?class\s+\w+/;
  const functionPattern = /^\s*(export\s+)?(async\s+)?function\s+\w+\s*\(/;
  // Match methods: optional visibility, optional static, optional async, method name, params, optional return type
  // Must NOT start with keywords like if, for, while, switch, etc.
  const methodPattern = /^\s*(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?(?!if|for|while|switch|catch|else)\w+\s*\([^)]*\)(?:\s*:\s*[^{]+)?\s*\{/;
  // Match getters: optional visibility, 'get', getter name, params, optional return type
  const getterPattern = /^\s*(?:public|private|protected)?\s*get\s+\w+\s*\([^)]*\)(?:\s*:\s*[^{]+)?\s*\{/;

  let missingJsdoc = [];

  // Track if we're inside a template literal
  let inTemplateLiteral = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip spec files
    if (filePath.includes('.spec.ts')) {
      continue;
    }

    // Track template literal state
    const backtickCount = (line.match(/`/g) || []).length;
    if (backtickCount % 2 === 1) {
      inTemplateLiteral = !inTemplateLiteral;
    }

    // Skip if we're inside a template literal
    if (inTemplateLiteral) {
      continue;
    }

    // Skip lines that are clearly not declarations
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('//') ||
        trimmedLine.startsWith('*') ||
        trimmedLine.startsWith('interface ') ||
        trimmedLine.startsWith('type ') ||
        trimmedLine.match(/^\s*(const|let|var)\s+\w+\s*=/) ||
        trimmedLine.includes('@ViewChild') ||
        trimmedLine.includes('@Input') ||
        trimmedLine.includes('@Output')) {
      continue;
    }

    // Check for class declarations
    const isClass = classPattern.test(line);
    // Check for function declarations
    const isFunction = functionPattern.test(line);
    // Check for method declarations
    const isMethod = methodPattern.test(line) && !line.includes('=');
    // Check for getter declarations
    const isGetter = getterPattern.test(line);

    if (isClass || isFunction || isMethod || isGetter) {
      // For methods, check if they're inside an object literal argument (inline callback)
      // by looking backwards for a pattern like "= someFunction(..., {"
      if (isMethod || isGetter) {
        let foundObjectLiteralContext = false;

        for (let j = i - 1; j >= 0; j--) {
          const prevLine = lines[j].trim();

          // Skip empty lines, comments, and istanbul directives
          if (prevLine === '' ||
              prevLine.startsWith('//') ||
              prevLine.startsWith('*') ||
              prevLine.startsWith('*/')) {
            continue;
          }

          // If we find a line with assignment and function call with opening brace,
          // this method is inside an object literal argument
          if (prevLine.match(/=\s*\w+\([^)]*\)\s*,?\s*\{/) ||
              prevLine.match(/=\s*\w+\([^)]*,\s*\{/)) {
            foundObjectLiteralContext = true;
            break;
          }

          // If we hit a class keyword, method keyword with closing brace, or other structural boundary, stop
          if (prevLine.match(/^(export\s+)?class\s+\w+/) ||
              prevLine.match(/^\s*(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?\w+\s*\([^)]*\)\s*\{/) ||
              prevLine.match(/^\}$/)) {
            break;
          }

          // Don't look back more than 10 lines for object literal context
          if (i - j > 10) {
            break;
          }
        }

        // Skip this method if it's in an object literal argument
        if (foundObjectLiteralContext) {
          continue;
        }
      }

      // Look backwards for JSDoc - must be immediately preceding (with only decorators/whitespace between)
      let hasJsdoc = false;
      let inJsdoc = false;
      let decoratorDepth = 0;

      for (let j = i - 1; j >= 0; j--) {
        const prevLine = lines[j].trim();

        // Skip empty lines
        if (prevLine === '') continue;

        // Track decorator bodies (going backwards: } increases depth, { decreases)
        if (prevLine.includes('}')) decoratorDepth++;
        if (prevLine.includes('{')) decoratorDepth--;

        // If we're inside a decorator body, skip
        if (decoratorDepth > 0) {
          continue;
        }

        // Skip decorator lines (start with @)
        if (prevLine.startsWith('@')) {
          // If it's @HostListener, mark as having JSDoc (these are self-documenting)
          if (prevLine.includes('@HostListener')) {
            hasJsdoc = true;
            break;
          }
          continue;
        }

        // Skip decorator closing line
        if (prevLine === '})' || prevLine === '},') {
          decoratorDepth++;
          continue;
        }

        // Skip single-line comments
        if (prevLine.startsWith('//')) {
          continue;
        }

        // If we're in JSDoc content
        if (inJsdoc) {
          // Skip JSDoc content lines
          if (prevLine.startsWith('*') && !prevLine.startsWith('/**')) {
            continue;
          }
          // Found JSDoc opening
          if (prevLine.startsWith('/**')) {
            hasJsdoc = true;
            break;
          }
        }

        // Found JSDoc end marker
        if (prevLine === '*/') {
          inJsdoc = true;
          continue;
        }

        // Found other content - stop looking
        break;
      }

      if (!hasJsdoc) {
        // Extract name
        let name = 'unknown';
        let type = 'function';

        if (isClass) {
          const match = line.match(/class\s+(\w+)/);
          name = match ? match[1] : 'unknown';
          type = 'class';
        } else if (isFunction) {
          const match = line.match(/function\s+(\w+)/);
          name = match ? match[1] : 'unknown';
          type = 'function';
        } else if (isMethod || isGetter) {
          const match = line.match(/(\w+)\s*\(/);
          name = match ? match[1] : 'unknown';
          type = isGetter ? 'getter' : 'method';

          // Skip only constructor - all other methods require JSDoc documentation
          if (name === 'constructor') {
            continue;
          }
        }

        missingJsdoc.push({
          line: i + 1,
          name,
          type,
          content: line.trim()
        });
      }
    }
  }

  if (missingJsdoc.length > 0) {
    console.error(`  ❌ ERROR: Found ${missingJsdoc.length} item(s) without JSDoc:`);
    missingJsdoc.forEach(({ line, name, type, content }) => {
      console.error(`     Line ${line} (${type} ${name}): ${content.substring(0, 60)}...`);
    });
    console.error(`     Please add JSDoc comments with @param and @returns tags`);
    hasErrors = true;
  }

  if (consoleLogLines.length === 0 && missingJsdoc.length === 0) {
    console.log(`  ✅ No issues found`);
  }
}

// Get files from command line arguments
const files = process.argv.slice(2);

if (files.length === 0) {
  console.log('No files to check');
  process.exit(0);
}

files.forEach(file => {
  if (file.endsWith('.ts') && !file.endsWith('.spec.ts')) {
    checkFile(file);
  }
});

if (hasErrors) {
  console.error('\n❌ Commit blocked: Please fix the errors above\n');
  process.exit(1);
} else {
  console.log('\n✅ All checks passed!\n');
  process.exit(0);
}
