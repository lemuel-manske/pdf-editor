import { describe, it, expect } from 'vitest';
import { createTextBox } from '../src/index.js';

describe('createTextBox', () => {
  it('keeps the position and identity it is given', () => {
    const box = createTextBox({ id: 't1', page: 2, xPt: 10, yPt: 20 });
    expect(box).toEqual({
      id: 't1',
      page: 2,
      xPt: 10,
      yPt: 20,
      text: '',
      fontSizePt: 16,
      color: '#000000',
    });
  });

  it('lets caller override text and style', () => {
    const box = createTextBox({ id: 't2', page: 1, xPt: 0, yPt: 0, text: 'hi', fontSizePt: 24, color: '#ff0000' });
    expect({ text: box.text, fontSizePt: box.fontSizePt, color: box.color }).toEqual({ text: 'hi', fontSizePt: 24, color: '#ff0000' });
  });
});
