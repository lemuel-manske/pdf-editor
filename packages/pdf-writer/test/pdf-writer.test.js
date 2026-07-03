import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { createPdfWriter } from "../src/index.js";

const require = createRequire(import.meta.url);

describe("createPdfWriter exportPdf", () => {
  it("bakes the box text into the page", async () => {
    const writer = createPdfWriter();
    const box = {
      id: "t1",
      page: 1,
      xPt: 20,
      yPt: 250,
      text: "Hello",
      fontSizePt: 16,
      color: "#000000",
    };
    const out = await writer.exportPdf(await blankPdf(), [box]);
    expect(await extractText(out)).toBe("Hello");
  });

  it("skips boxes whose page does not exist", async () => {
    const writer = createPdfWriter();
    const boxes = [
      {
        id: "t1",
        page: 1,
        xPt: 20,
        yPt: 250,
        text: "Keep",
        fontSizePt: 16,
        color: "#000000",
      },
      {
        id: "t2",
        page: 9,
        xPt: 20,
        yPt: 250,
        text: "Drop",
        fontSizePt: 16,
        color: "#000000",
      },
    ];
    const out = await writer.exportPdf(await blankPdf(), boxes);
    expect(await extractText(out)).toBe("Keep");
  });
});

async function blankPdf(width = 200, height = 300, pages = 1) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) doc.addPage([width, height]);
  return new Uint8Array(await doc.save());
}

async function extractText(bytes) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc =
    require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  return content.items.map((item) => item.str).join("");
}
