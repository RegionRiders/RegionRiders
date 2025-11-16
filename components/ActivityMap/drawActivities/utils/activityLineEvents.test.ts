import type { GPXTrack } from '@/lib/types/types';
import { attachActivityClickHandler, attachActivityHoverEvents } from './activityLineEvents';

describe('activityLineEvents', () => {
  describe('attachActivityHoverEvents', () => {
    it('should attach mouseover and mouseout event handlers', () => {
      const mockPolyline = {
        on: jest.fn(),
        setStyle: jest.fn(),
        bringToFront: jest.fn(),
      };

      attachActivityHoverEvents(mockPolyline as any);

      expect(mockPolyline.on).toHaveBeenCalledTimes(2);
      expect(mockPolyline.on).toHaveBeenCalledWith('mouseover', expect.any(Function));
      expect(mockPolyline.on).toHaveBeenCalledWith('mouseout', expect.any(Function));
    });

    it('should change style on mouseover', () => {
      const mockPolyline = {
        on: jest.fn((event: string, handler: () => void) => {
          if (event === 'mouseover') {
            handler.call(mockPolyline);
          }
        }),
        setStyle: jest.fn(),
        bringToFront: jest.fn(),
      };

      attachActivityHoverEvents(mockPolyline as any);

      expect(mockPolyline.setStyle).toHaveBeenCalledWith({
        color: '#4ADE80',
        weight: 4,
        opacity: 1,
      });
      expect(mockPolyline.bringToFront).toHaveBeenCalled();
    });

    it('should change style on mouseout', () => {
      let mouseoutHandler: (() => void) | null = null;

      const mockPolyline = {
        on: jest.fn((event: string, handler: () => void) => {
          if (event === 'mouseout') {
            mouseoutHandler = handler;
          }
        }),
        setStyle: jest.fn(),
        bringToFront: jest.fn(),
      };

      attachActivityHoverEvents(mockPolyline as any);

      if (mouseoutHandler) {
        (mouseoutHandler as () => void).call(mockPolyline);
      }

      expect(mockPolyline.setStyle).toHaveBeenCalledWith({
        color: '#FF6B6B',
        weight: 2,
        opacity: 0.6,
      });
    });
  });

  describe('attachActivityClickHandler', () => {
    const mockTrack: GPXTrack = {
      id: 'track-1',
      name: 'Test Track',
      points: [{ lat: 50.0, lon: 14.0 }],
      metadata: { distance: 10.0 },
    };

    const mockPopup = {
      setLatLng: jest.fn().mockReturnThis(),
      setContent: jest.fn().mockReturnThis(),
      openOn: jest.fn().mockReturnThis(),
    };

    beforeEach(() => {
      global.L = {
        popup: jest.fn(() => mockPopup),
      } as any;
    });

    it('should attach click event handler', () => {
      const mockPolyline = {
        on: jest.fn(),
      };

      attachActivityClickHandler(mockPolyline as any, {}, 'track-1', mockTrack);

      expect(mockPolyline.on).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });
});
