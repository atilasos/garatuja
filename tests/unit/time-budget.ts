/**
 * Wall-clock budgets are measured on a developer machine. Shared CI runners are
 * slower and noisier, so the publishing workflow sets GARATUJA_TIME_SCALE to
 * widen the budgets there instead of letting timing noise block a release.
 */
export function timeBudget(ms: number): number {
  const scale = Number(process.env.GARATUJA_TIME_SCALE ?? 1);
  return ms * (Number.isFinite(scale) && scale >= 1 ? scale : 1);
}
