import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import { PDFDocument } from "pdf-lib";
import { createPdfReader } from "../src/index.js";

const require = createRequire(import.meta.url);
const workerSrc = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");

let fixture;
beforeAll(async () => {
  fixture = await makeFixture();
});

describe("createPdfReader loadDocument", () => {
  it("reports the page count", async () => {
    const reader = createPdfReader({ workerSrc });
    const doc = await reader.loadDocument(fixture);
    expect(doc.pageCount).toBe(1);
  });

  it("reports the page size in points", async () => {
    const reader = createPdfReader({ workerSrc });
    const doc = await reader.loadDocument(fixture);
    const page = await doc.getPage(1);
    expect({ widthPt: page.widthPt, heightPt: page.heightPt }).toEqual({
      widthPt: 200,
      heightPt: 300,
    });
  });
});

describe("PageView conversions", () => {
  it("maps the screen top-left to the top of the page", async () => {
    const reader = createPdfReader({ workerSrc });
    const doc = await reader.loadDocument(fixture);
    const page = await doc.getPage(1);
    const view = page.getView(1);
    expect(view.screenToPdf({ x: 0, y: 0 }).yPt).toBe(300);
  });
});

async function makeFixture() {
  const doc = await PDFDocument.create();
  doc.addPage([200, 300]);
  return new Uint8Array(await doc.save());
}
