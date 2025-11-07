import { Injectable } from "@angular/core";
import { ENVIRONMENT } from 'src/environments/environment';
import packageJson from 'src/../package.json';

@Injectable({providedIn: 'root'})
export class LogService {
  constructor(){
    // Only log in browser, not during tests (Jasmine sets jasmine global)
    if(typeof (window as any)['jasmine'] === 'undefined' && ENVIRONMENT.env !== 'testing'){
      /* do not remove */console.log(`Angular Momentum!
Version: ${packageJson.version}
Environment: ${ENVIRONMENT.env}
Home: ${packageJson.siteUrl}
github: ${packageJson.repository}
    `);
    }
  }

  log(moduleName: string,message: string,object?: unknown): void {
    if(ENVIRONMENT.env !== 'production'){
      /* do not remove */console.log('[' + moduleName + '] ' + message,object ?? '');
    }
  };

}