export type TimingResult<T = unknown> = {
  label: string;
  ms: number;
  result: T;
};

export async function timeAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<TimingResult<T>> {
  const start = performance.now();
  const result = await fn();
  const ms = Math.round((performance.now() - start) * 100) / 100;
  return { label, ms, result };
}
