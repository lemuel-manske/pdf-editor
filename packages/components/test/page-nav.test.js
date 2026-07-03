// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { ContextProvider } from "@lit/context";
import { DocumentStore } from "@pdf-editor/core";
import { storeContext } from "../src/store-context.js";
import "../src/page-nav.js";

function fakeRenderer(pageCount = 3) {
  return {
    loadDocument: async () => ({ pageCount, getPage: async () => ({}) }),
  };
}

async function mountNav(store) {
  const host = document.createElement("div");
  new ContextProvider(host, { context: storeContext, initialValue: store });
  document.body.appendChild(host);
  const nav = document.createElement("page-nav");
  host.appendChild(nav);
  await nav.updateComplete;
  return nav;
}

describe("page-nav", () => {
  it("shows the current page and total", async () => {
    const store = new DocumentStore({
      renderer: fakeRenderer(3),
      exporter: {},
    });
    await store.openDocument(new Uint8Array([1]));
    const nav = await mountNav(store);
    expect(nav.renderRoot.querySelector(".counter").textContent.trim()).toBe(
      "Page 1 / 3",
    );
  });

  it("advances the page when Next is clicked", async () => {
    const store = new DocumentStore({
      renderer: fakeRenderer(3),
      exporter: {},
    });
    await store.openDocument(new Uint8Array([1]));
    const nav = await mountNav(store);
    nav.renderRoot.querySelector(".next").click();
    expect(store.state.currentPage).toBe(2);
  });
});
