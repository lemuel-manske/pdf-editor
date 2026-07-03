import { ContextConsumer } from "@lit/context";

import { storeContext } from "./store-context.js";

/**
 * Responsible for subscribing to the store context and updating
 * the host component when the store state changes.
 */
export class StoreController {
  constructor(host) {
    this.host = host;
    host.addController(this);

    this._unsubscribe = null;

    new ContextConsumer(host, {
      context: storeContext,
      subscribe: true,
      callback: (store) => this.#attach(store),
    });
  }

  get value() {
    return this._store;
  }

  hostDisconnected() {
    if (this._unsubscribe) this._unsubscribe();

    this._unsubscribe = null;
  }

  #attach(store) {
    if (this._unsubscribe) this._unsubscribe();

    this._store = store;
    this._unsubscribe = store.subscribe(() => this.host.requestUpdate());

    this.host.requestUpdate();
  }
}
