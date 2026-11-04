/**  Tuple of the emitted arguments. Labels show up as IDE hints. */
type EventType = unknown[];
type Subscriber<Event extends EventType> = (...event: Event) => void;

export abstract class Publisher<Event extends EventType> {
  private subscribers = new Set<Subscriber<Event>>();

  protected emit(...event: Event) {
    const errors: unknown[] = [];

    for (const subscriber of this.subscribers) {
      try {
        subscriber(...event);
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length === 1) {
      throw errors[0];
    }

    if (errors.length > 1) {
      throw new AggregateError(errors, 'Several subscribers threw');
    }
  }

  subscribe(subscriber: Subscriber<Event>): () => void {
    this.subscribers.add(subscriber);
    return () => this.unsubscribe(subscriber);
  }

  unsubscribe(subscriber: Subscriber<Event>): void {
    this.subscribers.delete(subscriber);
  }
}
