export function drawLineToAccumulator(
    accumulator: Uint32Array<any>,
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

    const core = Math.floor(thickness * 0.7);
    const coreThicknessSq = core * core;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = Math.round(x0 + dx * t);
        const y = Math.round(y0 + dy * t);

        for (let dx = -thickness; dx <= thickness; dx++) {
            for (let dy = -thickness; dy <= thickness; dy++) {
                const distSq = dx * dx + dy * dy;
                const dist = Math.sqrt(distSq);

                if (dist <= thickness) {
                    const px = x + dx;
                    const py = y + dy;

                    if (px >= 0 && px < width && py >= 0 && py < height) {
                        const idx = py * width + px;

                        // Core (solid)
                        if (distSq <= coreThicknessSq) {
                            accumulator[idx]++;
                        }
                        // Edge (antialiased)
                        else {
                            const alpha = Math.max(0, 1 - (dist - core));
                            accumulator[idx] += alpha;
                        }
                    }
                }
            }
        }
    }
}
