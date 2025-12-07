import L from 'leaflet';
import { CanvasDimensions } from '@/components/ActivityMap/drawActivities/activityTypes';
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
      bottomRight: new L.Point(100, 100),
    };
    expect(validateCanvasDimensions(dims)).toBe(false);
  });

  it('returns false for negative height', () => {
    const dims: CanvasDimensions = {
      canvasWidth: 100,
      canvasHeight: -1,
      topLeft: new L.Point(0, 0),
      bottomRight: new L.Point(100, 100),
    };
    expect(validateCanvasDimensions(dims)).toBe(false);
  });

  it('returns false for NaN width', () => {
    const dims: CanvasDimensions = {
      canvasWidth: NaN,
      canvasHeight: 100,
      topLeft: new L.Point(0, 0),
      bottomRight: new L.Point(100, 100),
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

  it('returns false for NaN in topLeft.x', () => {
    const dims: CanvasDimensions = {
      canvasWidth: 100,
      canvasHeight: 100,
      topLeft: new L.Point(NaN, 0),
      bottomRight: new L.Point(100, 100),
    };
    expect(validateCanvasDimensions(dims)).toBe(false);
  });

  it('returns false for Infinity in topLeft.y', () => {
    const dims: CanvasDimensions = {
      canvasWidth: 100,
      canvasHeight: 100,
      topLeft: new L.Point(0, Infinity),
      bottomRight: new L.Point(100, 100),
    };
    expect(validateCanvasDimensions(dims)).toBe(false);
  });

  it('returns false for NaN in bottomRight.x', () => {
    const dims: CanvasDimensions = {
      canvasWidth: 100,
      canvasHeight: 100,
      topLeft: new L.Point(0, 0),
      bottomRight: new L.Point(NaN, 100),
    };
    expect(validateCanvasDimensions(dims)).toBe(false);
  });

  it('returns false for Infinity in bottomRight.y', () => {
    const dims: CanvasDimensions = {
      canvasWidth: 100,
      canvasHeight: 100,
      topLeft: new L.Point(0, 0),
      bottomRight: new L.Point(100, Infinity),
    };
    expect(validateCanvasDimensions(dims)).toBe(false);
  });

  it('returns false when bottomRight.x < topLeft.x (invalid bounds)', () => {
    const dims: CanvasDimensions = {
      canvasWidth: 100,
      canvasHeight: 100,
      topLeft: new L.Point(100, 0),
      bottomRight: new L.Point(50, 100),
    };
    expect(validateCanvasDimensions(dims)).toBe(false);
  });

  it('returns false when bottomRight.y < topLeft.y (invalid bounds)', () => {
    const dims: CanvasDimensions = {
      canvasWidth: 100,
      canvasHeight: 100,
      topLeft: new L.Point(0, 100),
      bottomRight: new L.Point(100, 50),
    };
    expect(validateCanvasDimensions(dims)).toBe(false);
  });

  it('returns true when topLeft equals bottomRight (edge case)', () => {
    const dims: CanvasDimensions = {
      canvasWidth: 100,
      canvasHeight: 100,
      topLeft: new L.Point(50, 50),
      bottomRight: new L.Point(50, 50),
    };
    expect(validateCanvasDimensions(dims)).toBe(true);
  });
});
