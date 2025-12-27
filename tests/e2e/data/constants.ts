// API configuration
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4201';
export const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:4200';

// Performance thresholds
export const thresholds = {
    pageLoad: 40,
    memory: 80000000
};

export function getThreshold(thresholdKey: keyof typeof thresholds): number {
    return thresholds[thresholdKey] * 1.2;
}

// Visual diff threshold (0.003 = 0.3% difference allowed)
export const VISUAL_DIFF_THRESHOLD = 0.003;