/** Waits until every promise callback queued so far has run */
export const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
