import { InjectionToken } from '@angular/core';
import type { Request } from 'express';

/**
 * Injection token for the Express request object during SSR.
 * Use this to access request headers, cookies, etc. in Angular services.
 */
export const EXPRESS_REQUEST = new InjectionToken<Request>('EXPRESS_REQUEST');
