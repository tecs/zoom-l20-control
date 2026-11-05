import { mock } from 'node:test';
import type { MidiMessage } from '../../core/messaging/blemidi.ts';
import type { ShortMessage } from '../../core/protocol/midi.ts';
import type { ErrorHandler, MessageHandler, StatusHandler, Transport, TransportStatus } from '../infra/transport.ts';
import type { Lock } from '../infra/wakelock.ts';

export function fakeTransport() {
  let messageHandler: MessageHandler = null;
  let statusHandler: StatusHandler = null;
  let errorHandler: ErrorHandler = null;

  const sent: ShortMessage[] = [];
  const sysex: number[][] = [];

  const transport = {
    sent,
    sysex,
    connect: mock.fn(async (): Promise<void> => {}),
    autoConnect: mock.fn(async (): Promise<boolean> => true),
    disconnect: mock.fn((): void => {}),
    sendMessage: async (message: ShortMessage): Promise<void> => void sent.push(message),
    sendValue: async (messages: ShortMessage[]): Promise<void> => void sent.push(...messages),
    sendSysEx: async (bytes: number[]): Promise<void> => void sysex.push(bytes),
    onMessage: (handler: MessageHandler) => void (messageHandler = handler),
    onStatus: (handler: StatusHandler) => void (statusHandler = handler),
    onError: (handler: ErrorHandler) => void (errorHandler = handler),
    receive: (message: MidiMessage) => messageHandler?.(message),
    fail: (message: string) => errorHandler?.(message),
    setStatus: (status: TransportStatus) => statusHandler?.(status),
  };

  return transport satisfies Transport;
}

export const fakeWakeLock = () =>
  ({
    acquire: mock.fn(async (): Promise<void> => {}),
    release: mock.fn(async (): Promise<void> => {}),
  }) satisfies Lock;
