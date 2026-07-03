import { LitElement, html, css } from "lit";
import { StoreController } from "./store-controller.js";

export class EditorToolbar extends LitElement {
  store = new StoreController(this);
  #fileName;

  static styles = css`
    :host {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 8px;
      border-bottom: 1px solid #ddd;
    }
    button.active {
      background: #4a90d9;
      color: #fff;
    }
    label {
      display: inline-flex;
      gap: 4px;
      align-items: center;
    }
  `;

  #openFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    this.#fileName = file.name;
    file
      .arrayBuffer()
      .then((buffer) => this.store.value.openDocument(new Uint8Array(buffer)));
    event.target.value = "";
  }

  #toggleText() {
    const store = this.store.value;
    store.setToolMode(store.state.toolMode === "text" ? "select" : "text");
  }

  #changeSize(event) {
    this.store.value.setStyle(this.store.value.state.selectedId, {
      fontSizePt: Number(event.target.value),
    });
  }

  #changeColor(event) {
    this.store.value.setStyle(this.store.value.state.selectedId, {
      color: event.target.value,
    });
  }

  #export() {
    this.store.value
      .exportPdf()
      .then((bytes) => downloadPdf(bytes, this.#fileName));
  }

  render() {
    const state = this.store.value?.state;
    const selected = state?.textBoxes.find(
      (box) => box.id === state.selectedId,
    );
    const size = selected
      ? selected.fontSizePt
      : (state?.style.fontSizePt ?? 16);
    const color = selected ? selected.color : (state?.style.color ?? "#000000");
    const disabled = !state?.document;

    return html`
      <label
        >Open PDF
        <input
          type="file"
          accept="application/pdf"
          hidden
          @change=${this.#openFile}
        />
      </label>
      <button
        class="text-tool ${state?.toolMode === "text" ? "active" : ""}"
        ?disabled=${disabled}
        @click=${this.#toggleText}
      >
        Text
      </button>
      <label
        >Size
        <input
          class="size"
          type="number"
          min="6"
          max="96"
          .value=${String(size)}
          ?disabled=${disabled}
          @change=${this.#changeSize}
        />
      </label>
      <label
        >Color
        <input
          class="color"
          type="color"
          .value=${color}
          ?disabled=${disabled}
          @change=${this.#changeColor}
        />
      </label>
      <button class="export" ?disabled=${disabled} @click=${this.#export}>
        Export
      </button>
    `;
  }
}

function downloadPdf(bytes, fileName) {
  const base = (fileName || "document").replace(/\.pdf$/i, "");
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${base}-edited.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

customElements.define("editor-toolbar", EditorToolbar);
