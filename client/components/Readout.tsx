import { createSignal, Show, type Accessor } from 'solid-js';

type ReadoutProps = {
  text: Accessor<string>;
  parse: (text: string) => number | null;
  onInput: (value: number) => void;
  label: string;
  name: string;
  class: string;
};

/** A control's value text - tap it to type an exact value */
export function Readout(props: ReadoutProps) {
  const [editing, setEditing] = createSignal(false);
  const [invalid, setInvalid] = createSignal(false);
  let input: HTMLInputElement | undefined;
  let button: HTMLButtonElement | undefined;
  let initialText = '';

  const start = (): void => {
    initialText = props.text();
    setInvalid(false);
    setEditing(true);
    if (input) {
      input.value = initialText;
      input.focus();
      input.select();
    }
  };

  const commit = (keepInvalid: boolean): boolean => {
    const text = input?.value.trim() ?? '';
    if (text === initialText) {
      return stop();
    }
    const value = props.parse(text);
    if (value === null) {
      if (keepInvalid) {
        setInvalid(true);
        return false;
      }
      return stop();
    }
    stop();
    props.onInput(value);
    return true;
  };

  const stop = (): boolean => {
    setEditing(false);
    return true;
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (commit(true)) {
        button?.focus();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      stop();
      button?.focus();
    }
  };

  return (
    <Show
      when={editing()}
      fallback={
        <button
          ref={button}
          type="button"
          class={`${props.class} readout-button`}
          aria-label={`Type a value for ${props.label}`}
          onClick={start}
        >
          {props.text()}
        </button>
      }
    >
      <input
        ref={input}
        class={`${props.class} readout-input`}
        type="text"
        name={props.name}
        aria-label={props.label}
        aria-invalid={invalid()}
        autocomplete="off"
        spellcheck={false}
        enterkeyhint="done"
        onKeyDown={onKeyDown}
        onInput={() => setInvalid(false)}
        onBlur={() => editing() && commit(false)}
      />
    </Show>
  );
}
