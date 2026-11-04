/** Readable text for a promise rejection */
export const describeError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.name === 'Error' ? error.message : `${error.name}: ${error.message}`;
  }
  if (typeof error === 'object' && error !== null) {
    try {
      const json = JSON.stringify(error);
      if (json !== '{}') {
        return json;
      }
    } catch {}
  }
  return String(error);
};
