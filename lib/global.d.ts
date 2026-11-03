export {};

declare global {
  /** Recursive `readonly`. To be used on pure data objects only. */
  type DeepReadonly<T> = {
    readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
  };

  type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
}
