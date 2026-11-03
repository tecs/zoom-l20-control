import type { Accessor } from 'solid-js';
import { toClassList } from '../infra/jsx.ts';

type ToggleProps = {
  active: Accessor<boolean | undefined>;
  onClick(): void;
  label: string;
  additionalClasses?: string | undefined;
};

export const Toggle = (props: ToggleProps) => (
  <button
    type="button"
    class="toggle"
    classList={{ on: props.active(), ...toClassList(props.additionalClasses) }}
    onClick={() => props.onClick()}
  >
    {props.label}
  </button>
);
