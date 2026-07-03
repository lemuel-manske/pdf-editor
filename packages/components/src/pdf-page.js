import { LitElement, html, css } from "lit";
import { repeat } from "lit/directives/repeat.js";

import { StoreController } from "./store-controller.js";
import "./text-box.js";

export class PdfPage extends LitElement {
  static properties = {
    _scale: { state: true },
    _view: { state: true },
  };

  store = new StoreController(this);

  constructor() {
    super();
    this._scale = 1;
    this._view = null;
    this._renderedPage = null;
    this._canvas = document.createElement("canvas");
    this._canvas.className = "canvas";
  }

  static styles = css`
    :host {
      display: block;
    }

    .frame {
      position: relative;
      width: 100%;
    }

    .canvas-host .canvas {
      display: block;
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.25);
    }

    .overlay {
      position: absolute;
      inset: 0;
    }
  `;

  firstUpdated() {
    this.renderRoot.querySelector(".canvas-host").appendChild(this._canvas);
    this._resizeObserver = new ResizeObserver(() => this.#renderPage());
    this._resizeObserver.observe(this.renderRoot.querySelector(".frame"));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
  }

  updated() {
    const state = this.store.value?.state;

    if (!state || !state.document) return;

    if (state.currentPage !== this._renderedPage) {
      this._renderedPage = state.currentPage;
      this.#renderPage();
    }
  }

  async #renderPage() {
    const state = this.store.value?.state;
    if (!state || !state.document) return;

    const page = await state.document.getPage(state.currentPage);
    const frame = this.renderRoot.querySelector(".frame");
    const width = frame?.clientWidth || page.widthPt;
    const scale = width / page.widthPt;

    await page.renderTo(this._canvas, scale);
    this._scale = scale;
    this._view = page.getView(scale);
  }

  #onClick(event) {
    const store = this.store.value;

    if (!store || store.state.toolMode !== "text" || !this._view) return;

    const rect = this._canvas.getBoundingClientRect();

    const point = this._view.screenToPdf({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });

    store.addTextBox({
      page: store.state.currentPage,
      xPt: point.xPt,
      yPt: point.yPt,
    });
  }

  render() {
    const state = this.store.value?.state;

    const boxes = state
      ? state.textBoxes.filter((box) => box.page === state.currentPage)
      : [];

    return html`
      <div class="frame" @click=${this.#onClick}>
        <div class="canvas-host"></div>
        <div class="overlay">
          ${repeat(
            boxes,
            (box) => box.id,
            (box) => html`
              <text-box
                .box=${box}
                .view=${this._view}
                .scale=${this._scale}
              ></text-box>
            `,
          )}
        </div>
      </div>
    `;
  }
}

customElements.define("pdf-page", PdfPage);
