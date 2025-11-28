# Git Hooks (Husky)

This directory contains Git hooks managed by [Husky](https://typicode.github.io/husky/).

## What it does

The `pre-commit` hook runs before every commit to enforce code quality:

- ❌ **Blocks commits** with `console.log` statements (except `/**/console` pattern)
- ⚠️ **Warns about** functions missing JSDoc comments
- Suggests using `LogService` for logging instead

## How it works

1. **Husky** manages git hooks that are version-controlled
2. **lint-staged** runs checks only on staged files (fast!)
3. **check-code-quality.js** validates TypeScript files for:
   - Console log statements
   - Missing JSDoc on functions

## Setup (for new team members)

When you clone the repo and run `npm install`, Husky automatically sets up the hooks.

No manual setup required!

## Bypassing (emergency only)

If you absolutely must bypass the pre-commit hook:

```bash
git commit --no-verify -m "your message"
```

**Warning:** Only use this in emergencies. The checks exist for a reason!

## Allowed patterns

### Console logs

The hook blocks `console.log`, but allows:
- `/**/console.log(...)` - Double-comment pattern for intentional logs
- Commented lines starting with `//`

### JSDoc

Functions should have JSDoc comments like:
```typescript
/**
 * Description of what the function does
 * @param paramName - Description of parameter
 * @returns Description of return value
 */
function myFunction(paramName: string): number {
  // ...
}
```

Lifecycle hooks (ngOnInit, constructor, etc.) are exempt from this check.
