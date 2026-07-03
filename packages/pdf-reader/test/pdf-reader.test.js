import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { createPdfReader } from "../src/index.js";

const require = createRequire(import.meta.url);
const workerSrc = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");

async function makeFixture() {
  const withText = await PDFDocument.create();
  const page = withText.addPage([200, 300]);
  const font = await withText.embedFont(StandardFonts.Helvetica);
  page.drawText("Fixture", { x: 20, y: 250, size: 12, font });
  return new Uint8Array(await withText.save());
}

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

  it("does not detach the caller bytes", async () => {
    const reader = createPdfReader({ workerSrc });
    const bytes = await makeFixture();
    const before = bytes.byteLength;
    await reader.loadDocument(bytes);
    expect(bytes.byteLength).toBe(before);
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

  it("round-trips a point back to the same screen pixel", async () => {
    const reader = createPdfReader({ workerSrc });
    const doc = await reader.loadDocument(fixture);
    const page = await doc.getPage(1);
    const view = page.getView(1.5);
    const point = view.screenToPdf({ x: 30, y: 40 });
    const back = view.pdfToScreen(point);
    expect(Math.hypot(back.x - 30, back.y - 40)).toBeCloseTo(0, 5);
  });
});
