/**
 * draws an antialiased line segment into the accumulator buffer for heatmap rendering
 * uses linear interpolation between points with circular brush for smooth appearance
 *
 * @param accumulator - pixel count buffer (width × height)
 * @param width - canvas width in pixels
 * @param height - canvas height in pixels
 * @param x0 - start x coordinate
 * @param y0 - start y coordinate
 * @param x1 - end x coordinate
 * @param y1 - end y coordinate
 * @param thickness - line thickness radius in pixels
 */
export function drawLineToAccumulator(
    accumulator: Float32Array,
    width: number,
    height: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    thickness: number
) {
    const dx = Math.round(x1) - Math.round(x0);
    const dy = Math.round(y1) - Math.round(y0);
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    if (steps === 0) {return;}

    // 70% core = solid, outer 30% = antialiased falloff
    const core = Math.floor(thickness * 0.7);
    const coreThicknessSq = core * core;

    // interpolate along line
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = Math.round(x0 + dx * t);
        const y = Math.round(y0 + dy * t);

        // draw circular brush at this point
        for (let offsetX = -thickness; offsetX <= thickness; offsetX++) {
            for (let offsetY = -thickness; offsetY <= thickness; offsetY++){
                const distSq = offsetX * offsetX + offsetY * offsetY;
                const dist = Math.sqrt(distSq);

                if (dist <= thickness) {
                    const px = x + offsetX;
                    const py = y + offsetY;

                    if (px >= 0 && px < width && py >= 0 && py < height) {
                        const idx = py * width + px;

                        if (distSq <= coreThicknessSq) {
                            // solid core
                            accumulator[idx]++;
                        } else {
                            // antialiased edge
                            const alpha = Math.max(0, 1 - (dist - core));
                            accumulator[idx] += alpha;
                        }
                    }
                }
            }
        }
    }
}
