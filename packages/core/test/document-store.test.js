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
