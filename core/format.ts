// Human-readable value formatting

import { clamp } from '../lib/drag.ts';
import { metaFor, type Distribution } from './protocol/meta.ts';
import { rangeOf } from './protocol/registry.ts';

/** Bytes as space-separated two-digit hex, e.g. `b0 3c 41`, cut after `limit` bytes */
export const hex = (bytes: ArrayLike<number>, limit = bytes.length): string =>
  Array.from(bytes)
    .slice(0, limit)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(' ');

const roundTo = (n: number, decimals = 1): number => {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
};

const formatDb = (db: number, bare: boolean): string => {
  if (db === -Infinity) {
    return '-∞';
  }
  db = roundTo(db);
  return `${db > 0 ? '+' : ''}${db}${bare ? '' : ' dB'}`;
};

const formatHz = (hz: number, bare: boolean): string => {
  const k = hz >= 1000;
  return `${roundTo(k ? hz / 1000 : hz)}${bare ? '' : ' '}${k ? 'k' : ''}${bare ? '' : 'Hz'}`;
};

export function formatValue(path: string, raw: number, bare = false): string {
  const meta = metaFor(path);
  if (!meta) {
    return String(raw);
  }

  if (meta.offAt !== undefined && raw === meta.offAt) {
    return 'off';
  }

  if (meta.format === 'pan' && raw === 50) {
    return 'C';
  }

  if (meta.format === 'pan') {
    return raw < 50 ? `L${50 - raw}` : `R${raw - 50}`;
  }

  if (!meta.dist) {
    return String(raw);
  }

  const value = meta.dist.toDomain(raw);
  switch (meta.unit) {
    case 'dB':
      return formatDb(value, bare);
    case 'Hz':
      return formatHz(value, bare);
    case 'BPM':
      return `${roundTo(value)}${bare ? '' : ' BPM'}`;
    default:
      return String(raw);
  }
}

const NUMBER = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)`;
const DB = new RegExp(String.raw`^(${NUMBER})\s*(?:db)?$`);
const HZ = new RegExp(String.raw`^(${NUMBER})\s*(k)?\s*(?:hz)?$`);
const BPM = new RegExp(String.raw`^(${NUMBER})\s*(?:bpm)?$`);
const PAN = new RegExp(String.raw`^([lr])\s*(\d+)$`);
const PLAIN = new RegExp(String.raw`^${NUMBER}$`);
const MINUS_INFINITY = new Set(['-inf', '-∞']);
const PAN_CENTER = 50;

/** Convert to a typed value in the control's own unit */
const parseDomain = (unit: string | null | undefined, input: string): number | null => {
  switch (unit) {
    case 'dB': {
      if (MINUS_INFINITY.has(input)) {
        return -Infinity;
      }
      const match = DB.exec(input);
      return match ? Number(match[1]) : null;
    }
    case 'Hz': {
      const match = HZ.exec(input);
      return match ? Number(match[1]) * (match[2] ? 1000 : 1) : null;
    }
    case 'BPM': {
      const match = BPM.exec(input);
      return match ? Number(match[1]) : null;
    }
    default:
      return null;
  }
};

const parsePan = (input: string): number | null => {
  if (input === 'c') {
    return PAN_CENTER;
  }
  const match = PAN.exec(input);
  if (match) {
    return PAN_CENTER + (match[1] === 'l' ? -1 : 1) * Number(match[2]);
  }
  // Signed -20 = L20
  return PLAIN.test(input) ? PAN_CENTER + Math.round(Number(input)) : null;
};

const toRaw = (dist: Distribution, domain: number): number => {
  const raw = dist.toRaw(domain);
  return Number.isFinite(domain) && !Number.isFinite(dist.toDomain(raw)) ? raw + 1 : raw;
};

/** Inverse of `formatValue()` */
export function parseValue(path: string, text: string): number | null {
  const input = text.trim().toLowerCase();
  if (input === '') {
    return null;
  }
  const meta = metaFor(path);

  let raw: number | null;
  if (meta?.offAt !== undefined && input === 'off') {
    raw = meta.offAt;
  } else if (meta?.format === 'pan') {
    raw = parsePan(input);
  } else if (meta?.dist) {
    const domain = parseDomain(meta.unit, input);
    raw = domain === null ? null : toRaw(meta.dist, domain);
  } else {
    raw = PLAIN.test(input) ? Math.round(Number(input)) : null;
  }
  return raw === null ? null : clamp(raw, rangeOf(path));
}
