import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { createPdfReader } from "../src/index.js";

const require = createRequire(import.meta.url);
const workerSrc = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");

async function makeFixture() {
  const doc = await PDFDocument.create();
  doc.addPage([200, 300]);
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
    await reader.loadDocument(fixture);
    expect(fixture.byteLength).toBe(fixture.length);
  });
});
