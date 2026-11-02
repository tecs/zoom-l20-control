/**  Tuple of the emitted arguments. Labels show up as IDE hints. */
type EventType = unknown[];
type Subscriber<Event extends EventType> = (...event: Event) => void;

export abstract class Publisher<Event extends EventType> {
  private subscribers = new Set<Subscriber<Event>>();

  protected emit(...event: Event) {
    for (const subscriber of this.subscribers) {
      subscriber(...event);
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
