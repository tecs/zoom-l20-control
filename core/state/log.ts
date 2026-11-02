// Log store with per-severity ring buffer

import { Publisher } from '../../lib/publisher.ts';

// ordered from highest to lowest severity
export const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const LOG_KINDS = ['fader', 'mute', 'solo', 'pan', 'eq', 'fx', 'misc', 'sysex', 'status'] as const;
export type LogKind = (typeof LOG_KINDS)[number] | '';

/** Classify a decoded field path into a log kind */
export const logKindForPath = (path: string): LogKind => {
  if (path.endsWith('.mute')) {
    return 'mute';
  }
  if (path.endsWith('.solo')) {
    return 'solo';
  }
  if (path.endsWith('.pan')) {
    return 'pan';
  }
  if (path.endsWith('fx1Send') || path.endsWith('fx2Send')) {
    return 'fx';
  }
  if (path.includes('.sends.') || path.endsWith('.level')) {
    return 'fader';
  }
  if (path.startsWith('geq') || path.includes('.eq') || path.endsWith('lowCut')) {
    return 'eq';
  }
  // FX catch-all must be at the end
  if (path.startsWith('fx.')) {
    return 'fx';
  }
  return 'misc';
};

export interface LogEntry {
  seq: number;
  text: string;
  level: LogLevel;
  kind: LogKind;
}

type LogCaps = Record<LogLevel, number>;
const DEFAULT_CAPS: LogCaps = { error: 200, warn: 200, info: 300, debug: 1000 };

export class Log extends Publisher<[entry: LogEntry | null]> {
  private cap: LogCaps;
  private buffers: Record<LogLevel, LogEntry[]> = { error: [], warn: [], info: [], debug: [] };
  private seq = 0;

  constructor(caps: Partial<LogCaps> = {}) {
    super();
    this.cap = { ...DEFAULT_CAPS, ...caps };
  }

  error(text: string, kind: LogKind = ''): void {
    this.write('error', text, kind);
  }

  warn(text: string, kind: LogKind = ''): void {
    this.write('warn', text, kind);
  }

  info(text: string, kind: LogKind = ''): void {
    this.write('info', text, kind);
  }

  debug(text: string, kind: LogKind = ''): void {
    this.write('debug', text, kind);
  }

  entries(minLevel: LogLevel = 'debug'): LogEntry[] {
    const fromIndex = LOG_LEVELS.indexOf(minLevel);
    return LOG_LEVELS.slice(0, fromIndex + 1)
      .flatMap((level) => this.buffers[level])
      .sort((a, b) => a.seq - b.seq);
  }

  clear(): void {
    for (const level of LOG_LEVELS) {
      this.buffers[level].length = 0;
    }
    this.emit(null);
  }

  private write(level: LogLevel, text: string, kind: LogKind): void {
    const log: LogEntry = { seq: this.seq++, text, level, kind };
    const buffer = this.buffers[level];

    buffer.push(log);
    if (buffer.length > this.cap[level]) {
      buffer.shift();
    }

    this.emit(log);
  }
}
