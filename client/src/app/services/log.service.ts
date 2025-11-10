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
    if(typeof (window as Window & { jasmine?: unknown })['jasmine'] === 'undefined' && ENVIRONMENT.env !== 'testing'){
      /* do not remove */console.log(`Angular Momentum!
Version: ${packageJson.version}
Environment: ${ENVIRONMENT.env}
Home: ${packageJson.siteUrl}
github: ${packageJson.repository}
    `);
    }
  }

  /**
   * Log a message with module context.
   * Only logs in non-production environments.
   *
   * @param moduleName - Name of the module/service logging the message
   * @param message - The log message
   * @param object - Optional object to log (will be stringified if empty)
   */
  log(moduleName: string,message: string,object?: unknown): void {
    if(ENVIRONMENT.env !== 'production'){
      /* do not remove */console.log('[' + moduleName + '] ' + message,object ?? '');
    }
  };

}