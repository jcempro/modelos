/**
 * tools.jcem.pro — JeanCarloEM
 * https://github.com/JeanCarloEM/tools.jcem.pro
 * Mozilla Public License 2.0 — https://www.mozilla.org/MPL/2.0/
 */
export type VersionIndex = { hash: string; timestamp: number };
export function createVersionIndex(hash: unknown, timestamp: unknown): VersionIndex;
export function generateVersionIndex(environment?: Record<string, string | undefined>): Promise<string>;
