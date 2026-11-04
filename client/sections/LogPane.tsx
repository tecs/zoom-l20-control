import { createSignal, createMemo, onCleanup, createEffect, untrack, For } from 'solid-js';
import { LOG_LEVELS, LOG_KINDS } from '../../core/state/log.ts';
import type { LogEntry, LogLevel, LogKind } from '../../core/state/log.ts';
import { useApp } from '../context.ts';

type LogPaneProps = {
  onReread(): void;
};

/** DOM bound regardless of buffer totals */
const DISPLAY_CAP = 1000;
const rank = (level: LogLevel): number => LOG_LEVELS.indexOf(level);

export function LogPane(props: LogPaneProps) {
  const { log } = useApp();
  let list: HTMLDivElement | undefined;

  const [minLevel, setMinLevel] = createSignal<LogLevel>('debug');
  const [kinds, setKinds] = createSignal<Set<LogKind>>(new Set(LOG_KINDS));
  const [entries, setEntries] = createSignal<LogEntry[]>([]);

  const passesLevel = (level: LogLevel): boolean => rank(level) <= rank(minLevel());
  const typeOn = (kind: LogKind): boolean => kind === '' || kinds().has(kind);
  const visible = createMemo(() => entries().filter(({ kind }) => typeOn(kind)));

  const toBottom = (): void => {
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  };

  const toggleType = (kind: LogKind): void => {
    setKinds((oldKinds) => {
      const newKinds = new Set(oldKinds);
      if (newKinds.has(kind)) {
        newKinds.delete(kind);
      } else {
        newKinds.add(kind);
      }
      return newKinds;
    });
  };

  // Re-snapshot the level-filtered stream on mount or min level change
  createEffect(() => {
    setEntries(log.entries(minLevel()).slice(-DISPLAY_CAP));
    toBottom();
  });

  onCleanup(
    log.subscribe((entry) => {
      // Log cleared
      if (entry === null) {
        setEntries([]);
        return;
      }

      if (!untrack(() => passesLevel(entry.level))) {
        return;
      }

      // The list renders synchronously, so measure it before updating the log entries
      const stick = list ? list.scrollHeight - list.scrollTop - list.clientHeight < 32 : true;

      setEntries((oldEntries) => oldEntries.concat(entry).slice(-DISPLAY_CAP));

      if (stick) {
        toBottom();
      }
    }),
  );

  return (
    <div id="logpane">
      <div class="log-head">
        <span>Log</span>
        <div class="log-actions">
          <label class="log-level">
            lvl
            <select value={minLevel()} onChange={(e) => setMinLevel(e.currentTarget.value as LogLevel)}>
              <For each={LOG_LEVELS}>{(level) => <option value={level}>{level}</option>}</For>
            </select>
          </label>
          <button
            type="button"
            title="Re-request the full state dump (0x2A) - useful for diffing"
            onClick={() => props.onReread()}
          >
            Re-read
          </button>
          <button type="button" onClick={() => log.clear()}>
            Clear
          </button>
        </div>
      </div>
      <div class="log-types">
        <For each={LOG_KINDS}>
          {(kind) => (
            <button
              type="button"
              class="log-type-chip"
              classList={{ off: !kinds().has(kind) }}
              onClick={() => toggleType(kind)}
            >
              {kind}
            </button>
          )}
        </For>
      </div>
      <div class="log-list" ref={list}>
        <For each={visible()}>{({ level, text }) => <div class={`log-line log-${level}`}>{text}</div>}</For>
      </div>
    </div>
  );
}
