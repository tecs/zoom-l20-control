import { Publisher } from '../../lib/publisher.ts';
import { deserializeDump, getPath, setPath, type State } from '../protocol/dump.ts';
import { decodeCC, encodeField, type DecodeResult, type Pair } from '../messaging/codec.ts';
import type { Value } from '../protocol/valuetypes.ts';
import type { ShortMessage } from '../protocol/midi.ts';

export type Source = 'local' | 'remote' | 'dump';

export interface Change {
  path: string;
  value: Value | undefined;
  source: Source;
}

export class Store extends Publisher<[change: Change, state: State]> {
  readonly state: State = {};

  // Set by the app to the transport's send. Null until wired (and in headless tests), in which case
  // dispatch still updates state and returns the messages it would have sent.
  onSend: ((messages: ShortMessage[]) => void) | null = null;

  // 14-bit reassembly buffer for live-message decode
  private pair: Pair = {};

  get(path: string): Value | undefined {
    return getPath(this.state, path) as Value | undefined;
  }

  loadDump(bytes: Uint8Array): void {
    Object.assign(this.state, deserializeDump(bytes));
    this.emit({ path: '', value: undefined, source: 'dump' }, this.state);
  }

  // Inbound
  applyMessage(message: ShortMessage): DecodeResult | null {
    const result = decodeCC(message, this.pair);
    if (result) {
      this.setField(result.path, result.value, 'remote');
    }
    return result;
  }

  // Outbound
  dispatch(path: string, value: Value): ShortMessage[] {
    this.setField(path, value, 'local');
    const messages = encodeField(path, value);
    if (messages.length) {
      this.onSend?.(messages);
    }
    return messages;
  }

  private setField(path: string, value: Value, source: Source): void {
    setPath(this.state, path, value);
    this.emit({ path, value, source }, this.state);
  }
}
