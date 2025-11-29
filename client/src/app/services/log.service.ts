import { Injectable } from "@angular/core";
import { ENVIRONMENT } from 'src/environments/environment';
import packageJson from 'src/../package.json';

/**
 * Service for centralized logging across the application.
 *
 * Provides environment-aware logging that respects environment settings
 * and test contexts (doesn't log during Jasmine tests).
 *
 * Features:
 * - Environment-specific logging (disabled in production)
 * - Test-aware (no logging during Jasmine test runs)
 * - Startup banner with application info
 * - Module-namespaced log messages
 */
@Injectable({providedIn: 'root'})
export class LogService {
  constructor(){
    // Only log in browser, not during tests (Jasmine sets jasmine global)
    if((globalThis as typeof globalThis & { jasmine?: unknown })['jasmine'] === undefined && ENVIRONMENT.env !== 'testing'){
      /**/console.log(`Angular Momentum!
Version: ${packageJson.version}
Environment: ${ENVIRONMENT.env}
Home: ${packageJson.siteUrl}
github: ${packageJson.repository}
    `);
    }
  }

  /**
   * Log a message with automatic caller context detection.
   * Only logs in non-production environments.
   *
   * Automatically extracts the class name from the call stack,
   * so you don't need to pass this.constructor.name.
   *
   * @param message - The log message
   * @param object - Optional object to log (will be stringified if empty)
   */
  log(message: string, object?: unknown): void {
    if(ENVIRONMENT.env !== 'production'){
      const caller = this.getCallerName();
      /**/console.log('[' + caller + '] ' + message, object ?? '');
    }
  }

  /**
   * Extract the caller's class name from the stack trace.
   * Handles both development and minified production builds.
   *
   * @returns The caller's class name or 'Unknown' if it cannot be determined
   */
  private getCallerName(): string {
    try {
      const stack = new Error('Stack trace').stack;
      // istanbul ignore next - Error.stack is always defined in V8/Chrome
      if (!stack) return 'Unknown';

      // Stack trace format (Chrome/Edge/Node):
      // Error
      //   at LogService.getCallerName (...)  <- index 1
      //   at LogService.log (...)             <- index 2
      //   at ClassName.method (...)           <- index 3 (this is what we want)
      const lines = stack.split('\n');
      const callerLine = lines[3]?.trim();

      if (!callerLine) return 'Unknown';

      // Try to extract class name from patterns like:
      // "at ClassName.method (...)" or "at new ClassName (...)"
      // Strip leading underscores (from minification)
      const regex = /at\s+(?:new\s+)?(\w+)[.\s]/;
      const match = regex.exec(callerLine);

      return match ? match[1].replace(/^_+/, '') : 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

}