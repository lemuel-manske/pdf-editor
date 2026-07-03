import { LitElement, html, css } from "lit";
import { ContextProvider } from "@lit/context";

import { storeContext } from "./store-context.js";
import "./editor-toolbar.js";
import "./pdf-page.js";
import "./page-nav.js";

export class PdfEditor extends LitElement {
  #provider = new ContextProvider(this, { context: storeContext });

  #onKeyDown = (event) => {
    if (event.key === "Escape") this._store?.select(null);
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

  set store(value) {
    this._store = value;
    this.#provider.setValue(value);

    this.requestUpdate();
  }

  get store() {
    return this._store;
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
