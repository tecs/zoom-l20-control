import type { JSX } from 'solid-js';

/** Turns `'a b c'` into `{ a: true, b: true, c: true }` */
export const toClassList = (classes = ''): JSX.ClassList =>
  Object.fromEntries(
    classes
      .split(' ')
      .filter(Boolean)
      .map((className) => [className, true]),
  );
