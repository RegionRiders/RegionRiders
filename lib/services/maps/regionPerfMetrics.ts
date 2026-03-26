import { createComponentLogger } from '@/lib/logger/client';

const logger = createComponentLogger('regionPerfMetrics');

interface RegionPerfState {
  firstRegionLayerAddedAt: number | null;
  mapReadyAt: number | null;
}

const perfState: RegionPerfState = {
  firstRegionLayerAddedAt: null,
  mapReadyAt: null,
};

export function markRegionMapReady(): void {
  perfState.mapReadyAt = performance.now();
}

export function markFirstRegionLayerAdded(): void {
  if (perfState.firstRegionLayerAddedAt !== null) {
    return;
  }

  perfState.firstRegionLayerAddedAt = performance.now();

  if (perfState.mapReadyAt !== null) {
    const duration = (perfState.firstRegionLayerAddedAt - perfState.mapReadyAt).toFixed(2);
    logger.info(`First region layer paint in ${duration}ms`);
  }
}

export function logRegionTileError(error: unknown): void {
  logger.error(`Region tile error: ${String(error)}`);
}

export function resetRegionPerfMetrics(): void {
  perfState.firstRegionLayerAddedAt = null;
  perfState.mapReadyAt = null;
}
