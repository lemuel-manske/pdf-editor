import { LitElement, html, css } from "lit";
import { StoreController } from "./store-controller.js";

export class PageNav extends LitElement {
  store = new StoreController(this);

  static styles = css`
    :host {
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: center;
      padding: 8px;
    }
  `;

  #prev() {
    const state = this.store.value.state;
    this.store.value.setPage(state.currentPage - 1);
  }

  #next() {
    const state = this.store.value.state;
    this.store.value.setPage(state.currentPage + 1);
  }

  render() {
    const state = this.store.value?.state;
    if (!state || !state.pageCount) return html``;

    return html`
      <button
        class="prev"
        ?disabled=${state.currentPage <= 1}
        @click=${this.#prev}
      >
        Prev
      </button>
      <span class="counter"
        >Page ${state.currentPage} / ${state.pageCount}</span
      >
      <button
        class="next"
        ?disabled=${state.currentPage >= state.pageCount}
        @click=${this.#next}
      >
        Next
      </button>
    `;
  }
}

customElements.define("page-nav", PageNav);
