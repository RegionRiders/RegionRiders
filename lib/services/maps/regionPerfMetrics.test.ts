import { createComponentLogger } from '@/lib/logger/client';
import {
  logRegionTileError,
  markFirstRegionLayerAdded,
  markRegionMapReady,
  resetRegionPerfMetrics,
} from './regionPerfMetrics';

jest.mock('@/lib/logger/client', () => ({
  createComponentLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('regionPerfMetrics', () => {
  const logger = (createComponentLogger as jest.Mock).mock.results[0]?.value as {
    info: jest.Mock;
    error: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetRegionPerfMetrics();
  });

  it('logs the first region layer paint after map readiness', () => {
    const performanceNowSpy = jest
      .spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(160);

    markRegionMapReady();
    markFirstRegionLayerAdded();

    expect(logger.info).toHaveBeenCalledWith('First region layer paint in 60.00ms');

    performanceNowSpy.mockRestore();
  });

  it('only records the first region layer paint once', () => {
    const performanceNowSpy = jest
      .spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(160)
      .mockReturnValueOnce(220);

    markRegionMapReady();
    markFirstRegionLayerAdded();
    markFirstRegionLayerAdded();

    expect(logger.info).toHaveBeenCalledTimes(1);

    performanceNowSpy.mockRestore();
  });

  it('allows a new first-region-paint measurement after reset', () => {
    const performanceNowSpy = jest
      .spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(160)
      .mockReturnValueOnce(300)
      .mockReturnValueOnce(390);

    markRegionMapReady();
    markFirstRegionLayerAdded();
    resetRegionPerfMetrics();
    markRegionMapReady();
    markFirstRegionLayerAdded();

    expect(logger.info).toHaveBeenNthCalledWith(1, 'First region layer paint in 60.00ms');
    expect(logger.info).toHaveBeenNthCalledWith(2, 'First region layer paint in 90.00ms');

    performanceNowSpy.mockRestore();
  });

  it('logs tile errors', () => {
    const error = { message: 'boom' };
    logRegionTileError(error);

    expect(logger.error).toHaveBeenCalledWith('Region tile error:', error);
  });
});
