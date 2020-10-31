export const DELAY_FOR_SECURITY = 2000;

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
