// 0x2A state-dump fixtures for tests

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Resolved relative to this module, so tests pass from any cwd
const dir = path.dirname(fileURLToPath(import.meta.url));

const parseDump = (text: string) =>
  Uint8Array.from(
    text
      .split(/\s+/)
      .filter((chunk) => /^[0-9A-Fa-f]{2}$/.test(chunk))
      .map((hex) => parseInt(hex, 16)),
  );

const load = (name: string): Dump | null => {
  try {
    const bytes = parseDump(fs.readFileSync(path.join(dir, name), 'utf8'));
    return bytes.length === 656 ? { name, bytes } : null;
  } catch {
    return null;
  }
};

interface Dump {
  name: string;
  bytes: Uint8Array;
}

const NAMED = [
  'baseline.dump', // reference/default state
  'tweaked.dump', // a channel-tweaked capture
];

export const DUMPS: Dump[] = NAMED.map(load).filter((dump) => dump !== null);
export const BASELINE: Uint8Array | null = DUMPS[0]?.bytes ?? null;
