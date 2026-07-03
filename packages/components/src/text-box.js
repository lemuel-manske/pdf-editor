import { LitElement, html, css } from "lit";

import { StoreController } from "./store-controller.js";

export class TextBox extends LitElement {
  static properties = {
    box: { attribute: false },
    view: { attribute: false },
    scale: { attribute: false },
  };

  store = new StoreController(this);

  constructor() {
    super();
    this.scale = 1;
  }

  static styles = css`
    :host {
      position: absolute;
    }

    .editable {
      min-width: 8px;
      min-height: 1em;
      outline: 1px dashed transparent;
      white-space: pre;
      cursor: move;
      font-family: Helvetica, Arial, sans-serif;
      line-height: 1.15;
    }

    :host([selected]) .editable {
      outline-color: #4a90d9;
    }

    .delete {
      position: absolute;
      top: -12px;
      right: -12px;
      width: 18px;
      height: 18px;
      line-height: 16px;
      padding: 0;
    }
  `;

  #onInput(event) {
    this.store.value.editText(this.box.id, event.target.innerText);
  }

  #onPointerDown(event) {
    event.stopPropagation();

    this.store.value.select(this.box.id);

    const start = { x: event.clientX, y: event.clientY };

    const origin = this.view.pdfToScreen({
      xPt: this.box.xPt,
      yPt: this.box.yPt,
    });

    const move = (moveEvent) => {
      const screen = {
        x: origin.x + (moveEvent.clientX - start.x),
        y: origin.y + (moveEvent.clientY - start.y),
      };

      this.store.value.moveTextBox(this.box.id, this.view.screenToPdf(screen));
    };

    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  #onDelete(event) {
    event.stopPropagation();

    this.store.value.deleteTextBox(this.box.id);
  }

  firstUpdated() {
    this._editable = this.renderRoot.querySelector(".editable");
    this._editable.innerText = this.box.text;

    if (this.store.value?.state.selectedId === this.box.id)
      this._editable.focus();
  }

  updated() {
    const selected = this.store.value?.state.selectedId === this.box.id;

    this.toggleAttribute("selected", selected);

    if (!this.view) return;

    const { x, y } = this.view.pdfToScreen({
      xPt: this.box.xPt,
      yPt: this.box.yPt,
    });

    this.style.left = `${x}px`;
    this.style.top = `${y}px`;
    this.style.color = this.box.color;
    this.style.fontSize = `${this.box.fontSizePt * this.scale}px`;
  }

  render() {
    return html`
      <div
        class="editable"
        contenteditable="plaintext-only"
        @pointerdown=${this.#onPointerDown}
        @input=${this.#onInput}
      ></div>
      <button class="delete" @pointerdown=${this.#onDelete}>✕</button>
    `;
  }
}

customElements.define("text-box", TextBox);
