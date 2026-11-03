import { mock, type MockFunctionContext } from 'node:test';

type StorageMethod = 'getItem' | 'setItem' | 'removeItem' | 'clear' | 'key';

export function createMockStorage(overloads?: Partial<Storage>): Storage & {
  mocks: { [K in StorageMethod]: MockFunctionContext<Storage[K]> };
} {
  const storage: Map<string, string> = new Map();

  const getItem = mock.fn(overloads?.getItem ?? ((key: string) => storage.get(key) ?? null));
  const setItem = mock.fn(overloads?.setItem ?? ((key: string, value: string) => void storage.set(key, value)));
  const removeItem = mock.fn(overloads?.removeItem ?? ((key: string) => void storage.delete(key)));
  const clear = mock.fn(overloads?.clear ?? (() => void storage.clear()));
  const key = mock.fn(overloads?.key ?? ((index: number) => [...storage.keys()][index] ?? null));

  return {
    get length() {
      return storage.size;
    },
    getItem,
    setItem,
    removeItem,
    clear,
    key,
    mocks: {
      getItem: getItem.mock,
      setItem: setItem.mock,
      removeItem: removeItem.mock,
      clear: clear.mock,
      key: key.mock,
    },
  };
}
