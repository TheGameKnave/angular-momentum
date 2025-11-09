export const thresholds = {
    pageLoad: 40,
    memory: 80000000
}
export function getThreshold(thresholdKey: keyof typeof thresholds){
    return thresholds[thresholdKey] * 1.2;
}