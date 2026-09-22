export async function runSeed<T>(fn: () => Promise<T>): Promise<T> {
  return fn();
}
