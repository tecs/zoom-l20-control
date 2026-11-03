import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Publisher } from './publisher.ts';

class DummyPublisher extends Publisher<[data: string]> {
  fire(data: string) {
    this.emit(data);
  }
}

describe('Publisher', () => {
  it('registers a subscriber to receive events', () => {
    const publisher = new DummyPublisher();
    const subscriber = mock.fn<(data: string) => void>();

    publisher.subscribe(subscriber);
    publisher.fire('foo');
    publisher.fire('bar');

    assert.strictEqual(subscriber.mock.callCount(), 2);
    assert.deepEqual(
      subscriber.mock.calls.flatMap((call) => call.arguments),
      ['foo', 'bar'],
    );
  });

  it('allows multiple subscribers to receive events', () => {
    const publisher = new DummyPublisher();
    const subscriber1 = mock.fn<(data: string) => void>();
    const subscriber2 = mock.fn<(data: string) => void>();

    publisher.subscribe(subscriber1);
    publisher.subscribe(subscriber2);
    publisher.fire('foo');

    assert.strictEqual(subscriber1.mock.callCount(), 1);
    assert.strictEqual(subscriber1.mock.callCount(), subscriber2.mock.callCount());
    assert.deepEqual(subscriber1.mock.calls[0].arguments, ['foo']);
    assert.deepEqual(subscriber1.mock.calls[0].arguments, subscriber2.mock.calls[0].arguments);
  });

  it('registers the same subscriber once', () => {
    const publisher = new DummyPublisher();
    const subscriber = mock.fn<(data: string) => void>();

    publisher.subscribe(subscriber);
    publisher.subscribe(subscriber);
    publisher.fire('foo');

    assert.strictEqual(subscriber.mock.callCount(), 1);
    assert.deepEqual(
      subscriber.mock.calls.flatMap((call) => call.arguments),
      ['foo'],
    );
  });

  it('stops notifying after unsubscribing, by either form', () => {
    const publisher = new DummyPublisher();
    const subscriber1 = mock.fn<(data: string) => void>();
    const subscriber2 = mock.fn<(data: string) => void>();

    const unsubscribe1 = publisher.subscribe(subscriber1);
    publisher.subscribe(subscriber2);

    publisher.fire('foo');
    unsubscribe1();

    publisher.fire('bar');
    publisher.unsubscribe(subscriber2);

    publisher.fire('baz');

    assert.deepEqual(
      subscriber1.mock.calls.flatMap((call) => call.arguments),
      ['foo'],
    );
    assert.deepEqual(
      subscriber2.mock.calls.flatMap((call) => call.arguments),
      ['foo', 'bar'],
    );
  });

  it('tolerates unsubscribing twice, or a subscriber that was never added', () => {
    const publisher = new DummyPublisher();
    const subscriber = mock.fn<(data: string) => void>();

    const unsubscribe = publisher.subscribe(subscriber);
    unsubscribe();

    assert.doesNotThrow(() => unsubscribe());
    assert.doesNotThrow(() => publisher.unsubscribe(subscriber));
    assert.doesNotThrow(() => publisher.unsubscribe(() => {}));

    publisher.fire('foo');
    assert.strictEqual(subscriber.mock.callCount(), 0);
  });
});
