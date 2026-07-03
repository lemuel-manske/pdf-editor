import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const LINE_HEIGHT_FACTOR = 1.15;

/** @returns {import('@pdf-editor/core/src/ports/pdf-exporter.js').PdfExporter} */
export function createPdfWriter() {
  return {
    async exportPdf(originalBytes, textBoxes) {
      const doc = await PDFDocument.load(originalBytes.slice());
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();

      for (const box of textBoxes) {
        const page = pages[box.page - 1];
        if (page) drawBox(page, font, box);
      }

      return new Uint8Array(await doc.save());
    },
  };
}

function drawBox(page, font, box) {
  const ascentPt = font.heightAtSize(box.fontSizePt, { descender: false });
  const lineHeightPt = box.fontSizePt * LINE_HEIGHT_FACTOR;
  const firstBaselineY = box.yPt - ascentPt;
  const color = hexToRgb(box.color);

  box.text.split("\n").forEach((line, index) => {
    page.drawText(line, {
      x: box.xPt,
      y: firstBaselineY - index * lineHeightPt,
      size: box.fontSizePt,
      font,
      color,
    });
  });
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const channel = (start) => parseInt(clean.slice(start, start + 2), 16) / 255;
  return rgb(channel(0), channel(2), channel(4));
}
