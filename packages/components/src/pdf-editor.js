import { LitElement, html, css } from "lit";
import { ContextProvider } from "@lit/context";

import { storeContext } from "./store-context.js";
import "./editor-toolbar.js";
import "./pdf-page.js";
import "./page-nav.js";

export class PdfEditor extends LitElement {
  #provider = new ContextProvider(this, { context: storeContext });
  #store = null;

  #onKeyDown = (event) => {
    if (event.key === "Escape") this.#store?.select(null);
  };

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #f4f4f5;
    }

    .stage {
      flex: 1;
      overflow: auto;
      display: flex;
      justify-content: center;
      padding: 16px;
    }

    pdf-page {
      width: min(800px, 100%);
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.#onKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.#onKeyDown);
  }

  setStore(store) {
    this.#store = store;
    this.#provider.setValue(store);

    this.requestUpdate();
  }

  render() {
    return html`
      <editor-toolbar></editor-toolbar>
      <div class="stage"><pdf-page></pdf-page></div>
      <page-nav></page-nav>
    `;
  }
}

customElements.define("pdf-editor", PdfEditor);
