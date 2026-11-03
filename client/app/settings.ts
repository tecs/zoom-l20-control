import { Publisher } from '../../lib/publisher.ts';

const STORAGE_KEY = 'zoom-l20-control.settings';

interface SettingSchemaBaseEntry<Type extends string, T> {
  key: string;
  label: string;
  type: Type;
  default: T;
}

type SettingsSchemaBooleanEntry = SettingSchemaBaseEntry<'bool', boolean>;

interface SettingsSchemaNumberEntry extends SettingSchemaBaseEntry<'number', number> {
  unit: string;
  min: number;
  max: number;
  step: number;
}

export type SettingSchemaEntry = SettingsSchemaBooleanEntry | SettingsSchemaNumberEntry;

export const SETTINGS_SCHEMA: SettingSchemaEntry[] = [
  { key: 'debug', label: 'Debug log pane', type: 'bool', default: false },
  { key: 'peakShow', label: 'Meter peak line', type: 'bool', default: true },
  { key: 'peakHold', label: 'Peak hold time', type: 'number', unit: 'ms', default: 1000, min: 0, max: 5000, step: 100 },
];

export class Settings extends Publisher<[key: string, value: unknown]> {
  private storage: Storage;
  private values: Record<string, unknown> = {};

  readonly schema: DeepReadonly<SettingSchemaEntry[]>;

  constructor(schema: SettingSchemaEntry[], storage: Storage) {
    super();

    this.storage = storage;
    this.schema = schema;

    const saved = this.load();

    for (const setting of schema) {
      this.values[setting.key] = setting.key in saved ? saved[setting.key] : setting.default;
    }
  }

  private load(): Record<string, unknown> {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      }
    } catch {}
    return {};
  }

  private save(values: Record<string, unknown>): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {}
  }

  get(key: string): unknown {
    return this.values[key];
  }

  set(key: string, value: unknown): void {
    if (this.values[key] !== value) {
      this.values[key] = value;
      this.save(this.values);
      this.emit(key, value);
    }
  }
}
