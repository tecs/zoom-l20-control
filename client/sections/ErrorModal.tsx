import { For, createEffect, type Accessor } from 'solid-js';

type ErrorModalProps = {
  errors: Accessor<string[]>;
  open: Accessor<boolean>;
  onClose(): void;
  onClear(): void;
};

export function ErrorModal(props: ErrorModalProps) {
  let dialog!: HTMLDialogElement;

  createEffect(() => {
    const open = props.open();
    if (open === dialog.open) {
      return;
    }

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  });

  return (
    <dialog id="errors" class="modal" ref={dialog} onClose={() => props.onClose()}>
      <div class="detail-head">
        <strong>{props.errors().length > 1 ? 'Errors' : 'Error'}</strong>
        <span class="detail-head-buttons">
          <button type="button" onClick={() => props.onClear()}>
            Clear
          </button>
          <button type="button" onClick={() => props.onClose()}>
            Close
          </button>
        </span>
      </div>
      <div class="error-list">
        <For each={props.errors()}>{(error) => <div class="error-item">{error}</div>}</For>
      </div>
    </dialog>
  );
}
