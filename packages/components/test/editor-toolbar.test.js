// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { ContextProvider } from "@lit/context";
import { DocumentStore } from "@pdf-editor/core";
import { storeContext } from "../src/store-context.js";
import "../src/editor-toolbar.js";

describe("editor-toolbar", () => {
  it("activates the text tool when Text is clicked", async () => {
    const store = new DocumentStore({ renderer: fakeRenderer(), exporter: {} });
    await store.openDocument(new Uint8Array([1]));
    const toolbar = await mountToolbar(store);
    toolbar.renderRoot.querySelector(".text-tool").click();
    expect(store.state.toolMode).toBe("text");
  });

  it("pushes a font-size change to the store style", async () => {
    const store = new DocumentStore({ renderer: fakeRenderer(), exporter: {} });
    await store.openDocument(new Uint8Array([1]));
    const toolbar = await mountToolbar(store);
    const input = toolbar.renderRoot.querySelector(".size");
    input.value = "28";
    input.dispatchEvent(new Event("change"));
    expect(store.state.style.fontSizePt).toBe(28);
  });
});

function fakeRenderer() {
  return {
    loadDocument: async () => ({ pageCount: 1, getPage: async () => ({}) }),
  };
}

async function mountToolbar(store) {
  const host = document.createElement("div");
  new ContextProvider(host, { context: storeContext, initialValue: store });
  document.body.appendChild(host);
  const toolbar = document.createElement("editor-toolbar");
  host.appendChild(toolbar);
  await toolbar.updateComplete;
  return toolbar;
}
