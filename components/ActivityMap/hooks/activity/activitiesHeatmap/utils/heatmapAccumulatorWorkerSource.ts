export const HEATMAP_ACCUMULATOR_WORKER_SOURCE = `
self.onmessage = (event) => {
  const payload = event.data;
  const renderId = payload.renderId;
  const canvasWidth = payload.canvasWidth;
  const canvasHeight = payload.canvasHeight;
  const lineThickness = payload.lineThickness;
  const tracks = payload.tracks;

  try {
    const normalizeThickness = (thickness) => {
      if (!Number.isFinite(thickness)) {
        return 1;
      }
      return Math.min(10, Math.max(1, Math.round(thickness)));
    };

    const brushOffsetsCache = new Map();
    const getBrushOffsets = (radius) => {
      const cached = brushOffsetsCache.get(radius);
      if (cached) {
        return cached;
      }
      const offsets = [];
      if (radius <= 0) {
        offsets.push([0, 0]);
      } else {
        const radiusSq = radius * radius;
        for (let offsetX = -radius; offsetX <= radius; offsetX++) {
          for (let offsetY = -radius; offsetY <= radius; offsetY++) {
            if (offsetX * offsetX + offsetY * offsetY <= radiusSq) {
              offsets.push([offsetX, offsetY]);
            }
          }
        }
      }
      brushOffsetsCache.set(radius, offsets);
      return offsets;
    };

    const brushRadius = normalizeThickness(lineThickness) - 1;
    const cullPadding = Math.max(1, brushRadius + 1);
    const accumulator = new Float32Array(canvasWidth * canvasHeight);
    const touchedBounds = {
      minX: canvasWidth,
      minY: canvasHeight,
      maxX: -1,
      maxY: -1,
    };

    const stampBrush = (x, y) => {
      const offsets = getBrushOffsets(brushRadius);
      for (let i = 0; i < offsets.length; i++) {
        const offsetX = offsets[i][0];
        const offsetY = offsets[i][1];
        const px = x + offsetX;
        const py = y + offsetY;
        if (px >= 0 && px < canvasWidth && py >= 0 && py < canvasHeight) {
          accumulator[py * canvasWidth + px] += 1;
          if (px < touchedBounds.minX) touchedBounds.minX = px;
          if (py < touchedBounds.minY) touchedBounds.minY = py;
          if (px > touchedBounds.maxX) touchedBounds.maxX = px;
          if (py > touchedBounds.maxY) touchedBounds.maxY = py;
        }
      }
    };

    const drawLineToAccumulator = (x0, y0, x1, y1) => {
      if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) {
        return;
      }

      const roundedX0 = Math.round(x0);
      const roundedY0 = Math.round(y0);
      const roundedX1 = Math.round(x1);
      const roundedY1 = Math.round(y1);
      const dx = Math.abs(roundedX1 - roundedX0);
      const dy = Math.abs(roundedY1 - roundedY0);

      if (dx === 0 && dy === 0) {
        stampBrush(roundedX0, roundedY0);
        return;
      }

      let x = roundedX0;
      let y = roundedY0;
      const stepX = roundedX0 < roundedX1 ? 1 : -1;
      const stepY = roundedY0 < roundedY1 ? 1 : -1;
      let err = dx - dy;

      while (true) {
        stampBrush(x, y);
        if (x === roundedX1 && y === roundedY1) {
          break;
        }

        const err2 = err * 2;
        if (err2 > -dy) {
          err -= dy;
          x += stepX;
        }
        if (err2 < dx) {
          err += dx;
          y += stepY;
        }
      }
    };

    const isOutsideViewport = (x0, y0, x1, y1) => {
      const minX = Math.min(x0, x1);
      const maxX = Math.max(x0, x1);
      const minY = Math.min(y0, y1);
      const maxY = Math.max(y0, y1);

      return (
        maxX < -cullPadding ||
        maxY < -cullPadding ||
        minX > canvasWidth - 1 + cullPadding ||
        minY > canvasHeight - 1 + cullPadding
      );
    };

    for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
      const points = new Float32Array(tracks[trackIndex]);
      if (points.length < 4) {
        continue;
      }

      for (let i = 0; i <= points.length - 4; i += 2) {
        const x0 = points[i];
        const y0 = points[i + 1];
        const x1 = points[i + 2];
        const y1 = points[i + 3];

        if (isOutsideViewport(x0, y0, x1, y1)) {
          continue;
        }

        drawLineToAccumulator(x0, y0, x1, y1);
      }
    }

    const hasTouchedPixels = touchedBounds.maxX >= touchedBounds.minX && touchedBounds.maxY >= touchedBounds.minY;

    self.postMessage(
      {
        type: 'success',
        renderId,
        accumulatorBuffer: accumulator.buffer,
        touchedBounds: hasTouchedPixels ? touchedBounds : null,
      },
      [accumulator.buffer]
    );
  } catch (error) {
    self.postMessage({
      type: 'error',
      renderId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};`;
