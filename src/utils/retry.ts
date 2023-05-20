export const retryOnFail = async <T>(
  fn: () => Promise<T>,
  retryThreshold: number,
): Promise<T> => {
  let retryCount = 0;
  let error: Error | null = null;

  while (retryCount < retryThreshold) {
    try {
      const res = await fn();
      return res;
    } catch (e) {
      error = e;
    }
    retryCount++;
  }

  throw error;
};
