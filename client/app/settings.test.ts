import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Settings, type SettingSchemaEntry } from './settings.ts';
import { createMockStorage } from '../testing/storage.ts';

const SCHEMA: SettingSchemaEntry[] = [{ key: 'debug', label: 'x', type: 'bool', default: false }];

describe('Settings', () => {
  describe('get()', () => {
    it('reads values from storage', () => {
      const storage = createMockStorage({ getItem: () => '{"debug": true}' });
      const settings = new Settings(SCHEMA, storage);

      assert.equal(settings.get('debug'), true);
    });

    it('applies defaults when storage is empty', () => {
      const settings1 = new Settings(SCHEMA, createMockStorage());

      assert.equal(settings1.get('debug'), false);

      const storage = createMockStorage({ getItem: () => 'null' });
      const settings2 = new Settings(SCHEMA, storage);

      assert.equal(settings2.get('debug'), false);
    });

    it('applies defaults when storage fails to load', () => {
      const storage = createMockStorage({
        getItem() {
          throw new Error();
        },
      });
      const settings = new Settings(SCHEMA, storage);

      assert.equal(settings.get('debug'), false);
    });

    it('applies defaults when storage is corrupted', () => {
      const storage = createMockStorage({ getItem: () => 'Invalid JSON' });
      const settings = new Settings(SCHEMA, storage);

      assert.equal(settings.get('debug'), false);
    });
  });

  describe('set()', () => {
    it('updates the value', () => {
      const settings = new Settings(SCHEMA, createMockStorage());

      settings.set('debug', true);
      assert.equal(settings.get('debug'), true);
      settings.set('debug', false);
      assert.equal(settings.get('debug'), false);
    });

    it('stores the updated value', () => {
      const storage = createMockStorage();
      const settings = new Settings(SCHEMA, storage);

      settings.set('debug', true);
      assert.equal(storage.getItem(storage.key(0) ?? ''), '{"debug":true}');
      settings.set('debug', false);
      assert.equal(storage.getItem(storage.key(0) ?? ''), '{"debug":false}');
      assert.equal(storage.length, 1);
    });

    it('updates the value even if the storage fails', () => {
      const storage = createMockStorage({
        setItem() {
          throw new Error();
        },
      });
      const settings = new Settings(SCHEMA, storage);

      settings.set('debug', true);
      assert.equal(settings.get('debug'), true);
      settings.set('debug', false);
      assert.equal(settings.get('debug'), false);
    });

    it('does not store the same value', () => {
      const storage = createMockStorage();
      const settings = new Settings(SCHEMA, storage);

      settings.set('debug', true);
      settings.set('debug', true);
      assert.equal(storage.mocks.setItem.callCount(), 1);
    });
  });

  describe('subscribe()', () => {
    it('does not notify on setting the same value', () => {
      const settings = new Settings(SCHEMA, createMockStorage());
      const fn = mock.fn<(key: string, value: unknown) => void>();

      settings.subscribe(fn);

      settings.set('debug', true);
      settings.set('debug', true);
      assert.deepEqual(
        fn.mock.calls.map((call) => call.arguments),
        [['debug', true]],
      );
    });
  });
});
