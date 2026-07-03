import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

/** @returns {import('@pdf-editor/core/src/ports/pdf-renderer.js').PdfRenderer} */
export function createPdfReader({ workerSrc }) {
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  return {
    async loadDocument(bytes) {
      const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
      return {
        pageCount: pdf.numPages,
        getPage: (pageNumber) => loadPage(pdf, pageNumber),
      };
    },
  };
}

async function loadPage(pdf, pageNumber) {
  const page = await pdf.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });

  return {
    widthPt: base.width,
    heightPt: base.height,
    getView: (scale) => makeView(page, scale),
    async renderTo(canvas, scale) {
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");
      await page.render({ canvasContext: context, viewport }).promise;
    },
  };
}

function makeView(page, scale) {
  const viewport = page.getViewport({ scale });

  return {
    widthPx: viewport.width,
    heightPx: viewport.height,
    screenToPdf({ x, y }) {
      const [xPt, yPt] = viewport.convertToPdfPoint(x, y);
      return { xPt, yPt };
    },
    pdfToScreen({ xPt, yPt }) {
      const [x, y] = viewport.convertToViewportPoint(xPt, yPt);
      return { x, y };
    },
  };
}
