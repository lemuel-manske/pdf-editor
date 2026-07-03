export const DEFAULT_FONT_SIZE_PT = 16;
export const DEFAULT_COLOR = "#000000";

/**
 * @typedef {Object} TextBox
 * @property {string} id
 * @property {number} page        1-based page number
 * @property {number} xPt         left edge, PDF points (bottom-left origin)
 * @property {number} yPt         top edge, PDF points (bottom-left origin)
 * @property {string} text
 * @property {number} fontSizePt
 * @property {string} color       hex, e.g. "#000000"
 */

/** @returns {TextBox} */
export function createTextBox({
  id,
  page,
  xPt,
  yPt,
  text = "",
  fontSizePt = DEFAULT_FONT_SIZE_PT,
  color = DEFAULT_COLOR,
}) {
  return { id, page, xPt, yPt, text, fontSizePt, color };
}
