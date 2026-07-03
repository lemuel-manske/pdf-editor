import { createTextBox, DEFAULT_FONT_SIZE_PT, DEFAULT_COLOR } from "./model.js";

export class DocumentStore {
  #renderer;
  #exporter;
  #listeners = new Set();
  #idCounter = 0;

  #state = {
    pdfBytes: null,
    document: null,
    pageCount: 0,
    currentPage: 1,
    toolMode: "select",
    textBoxes: [],
    selectedId: null,
    style: { fontSizePt: DEFAULT_FONT_SIZE_PT, color: DEFAULT_COLOR },
  };

  constructor({ renderer, exporter }) {
    this.#renderer = renderer;
    this.#exporter = exporter;
  }

  get state() {
    return this.#state;
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #emit() {
    this.#state = { ...this.#state };
    for (const listener of this.#listeners) listener();
  }

  async openDocument(bytes) {
    const document = await this.#renderer.loadDocument(bytes);

    this.#state.pdfBytes = bytes;
    this.#state.document = document;
    this.#state.pageCount = document.pageCount;
    this.#state.currentPage = 1;
    this.#state.textBoxes = [];
    this.#state.selectedId = null;

    this.#emit();
  }

  setPage(n) {
    if (n < 1 || n > this.#state.pageCount) return;
    this.#state.currentPage = n;
    this.#emit();
  }

  addTextBox({ page, xPt, yPt }) {
    this.#idCounter += 1;

    const box = createTextBox({
      id: `t${this.#idCounter}`,
      page,
      xPt,
      yPt,
      fontSizePt: this.#state.style.fontSizePt,
      color: this.#state.style.color,
    });

    this.#state.textBoxes = [...this.#state.textBoxes, box];
    this.#state.selectedId = box.id;
    this.#state.toolMode = "select";

    this.#emit();

    return box;
  }

  select(id) {
    this.#state.selectedId = id;
    this.#emit();
  }

  moveTextBox(id, { xPt, yPt }) {
    this.#state.textBoxes = this.#state.textBoxes.map((b) =>
      b.id === id ? { ...b, xPt, yPt } : b,
    );
    this.#emit();
  }

  editText(id, text) {
    this.#state.textBoxes = this.#state.textBoxes.map((b) =>
      b.id === id ? { ...b, text } : b,
    );
    this.#emit();
  }

  setStyle(id, style) {
    this.#state.style = { ...this.#state.style, ...style };
    this.#state.textBoxes = this.#state.textBoxes.map((b) =>
      b.id === id ? { ...b, ...style } : b,
    );
    this.#emit();
  }

  deleteTextBox(id) {
    this.#state.textBoxes = this.#state.textBoxes.filter((b) => b.id !== id);
    if (this.#state.selectedId === id) this.#state.selectedId = null;
    this.#emit();
  }

  setToolMode(mode) {
    this.#state.toolMode = mode;
    this.#emit();
  }

  async exportPdf() {
    return this.#exporter.exportPdf(
      this.#state.pdfBytes,
      this.#state.textBoxes,
    );
  }
}
