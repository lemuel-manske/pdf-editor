import { describe, it, expect } from 'vitest';
import { DocumentStore } from '../src/index.js';

function fakeRenderer(document = { pageCount: 3, getPage: async () => ({}) }) {
  return { loadDocument: async () => document };
}

function fakeExporter(result = new Uint8Array([1, 2, 3])) {
  const calls = [];
  return { calls, exportPdf: async (bytes, boxes) => { calls.push({ bytes, boxes }); return result; } };
}

function makeStore(overrides = {}) {
  return new DocumentStore({ renderer: fakeRenderer(), exporter: fakeExporter(), ...overrides });
}

describe('DocumentStore.openDocument', () => {
  it('adopts the page count from the loaded document', async () => {
    const store = makeStore();
    await store.openDocument(new Uint8Array([9]));
    expect(store.state.pageCount).toBe(3);
  });

  it('retains the original bytes for export', async () => {
    const store = makeStore();
    const bytes = new Uint8Array([9]);
    await store.openDocument(bytes);
    expect(store.state.pdfBytes).toBe(bytes);
  });

  it('starts on page 1', async () => {
    const store = makeStore();
    await store.openDocument(new Uint8Array([9]));
    expect(store.state.currentPage).toBe(1);
  });
});

describe('DocumentStore.subscribe', () => {
  it('notifies listeners on change', async () => {
    const store = makeStore();
    let calls = 0;
    store.subscribe(() => { calls += 1; });
    await store.openDocument(new Uint8Array([9]));
    expect(calls).toBe(1);
  });

  it('stops notifying after unsubscribe', async () => {
    const store = makeStore();
    let calls = 0;
    const off = store.subscribe(() => { calls += 1; });
    off();
    await store.openDocument(new Uint8Array([9]));
    expect(calls).toBe(0);
  });
});

describe('DocumentStore.addTextBox', () => {
  it('adds a box on the requested page at the requested point', async () => {
    const store = makeStore();
    await store.openDocument(new Uint8Array([9]));
    const box = store.addTextBox({ page: 1, xPt: 40, yPt: 700 });
    expect({ page: box.page, xPt: box.xPt, yPt: box.yPt }).toEqual({ page: 1, xPt: 40, yPt: 700 });
  });

  it('selects the newly added box', async () => {
    const store = makeStore();
    await store.openDocument(new Uint8Array([9]));
    const box = store.addTextBox({ page: 1, xPt: 40, yPt: 700 });
    expect(store.state.selectedId).toBe(box.id);
  });

  it('applies the current default style', async () => {
    const store = makeStore();
    await store.openDocument(new Uint8Array([9]));
    const box = store.addTextBox({ page: 1, xPt: 0, yPt: 0 });
    expect(box.fontSizePt).toBe(16);
  });

  it('gives each box a distinct id', async () => {
    const store = makeStore();
    await store.openDocument(new Uint8Array([9]));
    const a = store.addTextBox({ page: 1, xPt: 0, yPt: 0 });
    const b = store.addTextBox({ page: 1, xPt: 0, yPt: 0 });
    expect(a.id === b.id).toBe(false);
  });
});

describe('DocumentStore.select', () => {
  it('sets the selected id', async () => {
    const store = makeStore();
    await store.openDocument(new Uint8Array([9]));
    store.select('t7');
    expect(store.state.selectedId).toBe('t7');
  });
});

describe('DocumentStore.moveTextBox', () => {
  it('updates the position of the target box', async () => {
    const store = makeStore();
    await store.openDocument(new Uint8Array([9]));
    const box = store.addTextBox({ page: 1, xPt: 0, yPt: 0 });
    store.moveTextBox(box.id, { xPt: 55, yPt: 66 });
    const moved = store.state.textBoxes.find((b) => b.id === box.id);
    expect({ xPt: moved.xPt, yPt: moved.yPt }).toEqual({ xPt: 55, yPt: 66 });
  });
});

describe('DocumentStore.editText', () => {
  it('updates the text of the target box', async () => {
    const store = makeStore();
    await store.openDocument(new Uint8Array([9]));
    const box = store.addTextBox({ page: 1, xPt: 0, yPt: 0 });
    store.editText(box.id, 'hello');
    const edited = store.state.textBoxes.find((b) => b.id === box.id);
    expect(edited.text).toBe('hello');
  });
});
