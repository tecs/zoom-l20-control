import { createEffect, type Accessor } from 'solid-js';

type SetupModalProps = {
  problem: Accessor<string | null>;
  open: Accessor<boolean>;
  onClose(): void;
};

export function SetupModal(props: SetupModalProps) {
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
    <dialog id="setup" class="modal" ref={dialog} onClose={() => props.onClose()}>
      <div class="detail-head">
        <strong>Setup needed</strong>
        <button type="button" onClick={() => props.onClose()}>
          Close
        </button>
      </div>
      <div class="setup-body">
        <p>This browser can't connect to a mixer yet.</p>
        <p class="setup-problem">{props.problem()}</p>
      </div>
    </dialog>
  );
}
