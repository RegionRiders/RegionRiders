import { readdir } from 'fs/promises';
import { join } from 'path';
import logger from '@/lib/utils/logger';

export async function GET() {
    try {
        // For now, we assume GPX files are stored in 'public/data/gpx' directory
        const gpxDir = join(process.cwd(), 'public', 'data', 'gpx');
        const files = await readdir(gpxDir);
        const gpxFiles = files.filter((f) => f.endsWith('.gpx'));
        return Response.json({ files: gpxFiles });
    } catch (error) {
        logger.info('Error reading GPX directory:', error);
        return Response.json({ files: [], error: String(error) }, { status: 500 });
    }
}
