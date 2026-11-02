// Human-readable value formatting

import { metaFor } from './protocol/meta.ts';

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
