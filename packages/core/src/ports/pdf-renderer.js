/**
 * @typedef {Object} PageView
 * @property {number} widthPx
 * @property {number} heightPx
 * @property {(screen: { x: number, y: number }) => { xPt: number, yPt: number }} screenToPdf
 * @property {(point: { xPt: number, yPt: number }) => { x: number, y: number }} pdfToScreen
 */

/**
 * @typedef {Object} PdfPage
 * @property {number} widthPt
 * @property {number} heightPt
 * @property {(scale: number) => PageView} getView
 * @property {(canvas: HTMLCanvasElement, scale: number) => Promise<void>} renderTo
 */

/**
 * @typedef {Object} PdfDocument
 * @property {number} pageCount
 * @property {(pageNumber: number) => Promise<PdfPage>} getPage
 */

/**
 * @typedef {Object} PdfRenderer
 * @property {(bytes: Uint8Array) => Promise<PdfDocument>} loadDocument
 */

export {};
