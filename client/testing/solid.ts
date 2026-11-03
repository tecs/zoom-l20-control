import { it } from 'node:test';
import { createRoot } from 'solid-js';

/** `it()` with the test body inside a Solid root */
export const inRootIt = (name: string, test: () => void): void => {
  it(name, () => {
    createRoot((dispose) => {
      try {
        test();
      } finally {
        dispose();
      }
    });
  });
};
