import L from 'leaflet';
import { CanvasDimensions } from '@/components/ActivityMap/drawActivities/types';
import { validateCanvasDimensions } from './canvasValidation';

describe('validateCanvasDimensions', () => {
  it('returns true for valid dimensions', () => {
    const dims: CanvasDimensions = {
      canvasWidth: 200,
      canvasHeight: 150,
      topLeft: new L.Point(0, 0),
      bottomRight: new L.Point(100, 100),
    };
    expect(validateCanvasDimensions(dims)).toBe(true);
  });

  it('returns false for zero width', () => {
    const dims: CanvasDimensions = {
      canvasWidth: 0,
      canvasHeight: 100,
      topLeft: new L.Point(0, 0),
      bottomRight: new L.Point(0, 100),
    };
    expect(validateCanvasDimensions(dims)).toBe(false);
  });

  it('returns false for negative height', () => {
    const dims: CanvasDimensions = {
      canvasWidth: 100,
      canvasHeight: -1,
      topLeft: new L.Point(0, 0),
      bottomRight: new L.Point(100, 0),
    };
    expect(validateCanvasDimensions(dims)).toBe(false);
  });

  it('returns false for NaN width', () => {
    const dims: CanvasDimensions = {
      canvasWidth: NaN,
      canvasHeight: 100,
      topLeft: new L.Point(0, 0),
      bottomRight: new L.Point(0, 100),
    };
    expect(validateCanvasDimensions(dims)).toBe(false);
  });

  it('returns false for infinite height', () => {
    const dims: CanvasDimensions = {
      canvasWidth: 100,
      canvasHeight: Infinity,
      topLeft: new L.Point(0, 0),
      bottomRight: new L.Point(100, 100),
    };
    expect(validateCanvasDimensions(dims)).toBe(false);
  });
});
