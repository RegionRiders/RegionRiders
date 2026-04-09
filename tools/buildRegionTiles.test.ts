import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  collectSourceFiles,
  getBuildOptions,
  runBuild,
  type BuildOptions,
} from './buildRegionTiles';

jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
}));

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'build-region-tiles-'));
}

describe('buildRegionTiles', () => {
  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.REGION_SOURCE_DIR;
  });

  it('collects only geojson files in sorted order', () => {
    const sourceDir = createTempDir();

    try {
      fs.writeFileSync(path.join(sourceDir, 'b.geojson'), '{}', 'utf8');
      fs.writeFileSync(path.join(sourceDir, 'a.geojson'), '{}', 'utf8');
      fs.writeFileSync(path.join(sourceDir, 'ignore.txt'), 'x', 'utf8');

      expect(collectSourceFiles(sourceDir)).toEqual([
        path.join(sourceDir, 'a.geojson'),
        path.join(sourceDir, 'b.geojson'),
      ]);
    } finally {
      fs.rmSync(sourceDir, { recursive: true, force: true });
    }
  });

  it('parses build options from argv', () => {
    const sourceDir = createTempDir();

    try {
      const options = getBuildOptions([
        'node',
        'tools/buildRegionTiles.ts',
        '--source',
        sourceDir,
        '--output',
        '/tmp/out',
        '--temp',
        '/tmp/regions.gpkg',
        '--normalized',
        '/tmp/regions-normalized.gpkg',
        '--minzoom',
        '4',
        '--maxzoom',
        '12',
        '--force',
      ]);

      expect(options).toEqual({
        sourceDir,
        outputDir: '/tmp/out',
        tempGpkg: '/tmp/regions.gpkg',
        normalizedGpkg: '/tmp/regions-normalized.gpkg',
        minZoom: 4,
        maxZoom: 12,
        force: true,
      });
    } finally {
      fs.rmSync(sourceDir, { recursive: true, force: true });
    }
  });

  it('requires an explicit source when argv and REGION_SOURCE_DIR are absent', () => {
    expect(() => getBuildOptions(['node', 'tools/buildRegionTiles.ts'])).toThrow(
      'No source directory configured. Pass --source <dir> or set REGION_SOURCE_DIR to a GeoJSON dataset directory.'
    );
  });

  it('rejects an inverted zoom range', () => {
    const sourceDir = createTempDir();

    try {
      expect(() =>
        getBuildOptions([
          'node',
          'tools/buildRegionTiles.ts',
          '--source',
          sourceDir,
          '--minzoom',
          '14',
          '--maxzoom',
          '12',
        ])
      ).toThrow('Invalid zoom range: minzoom (14) must be <= maxzoom (12)');
    } finally {
      fs.rmSync(sourceDir, { recursive: true, force: true });
    }
  });

  it('runs the expected GDAL commands and cleans temp artifacts', () => {
    const workspaceDir = createTempDir();
    const outputDir = path.join(workspaceDir, 'tiles', 'v1');
    const tempGpkg = path.join(workspaceDir, 'tiles', '.tmp_regions_v1.gpkg');
    const normalizedGpkg = path.join(workspaceDir, 'tiles', '.tmp_regions_v1_normalized.gpkg');
    const sourceFiles = [
      path.join(workspaceDir, 'a.geojson'),
      path.join(workspaceDir, 'b.geojson'),
    ];
    const options: BuildOptions = {
      sourceDir: workspaceDir,
      outputDir,
      tempGpkg,
      normalizedGpkg,
      minZoom: 3,
      maxZoom: 12,
      force: true,
    };

    fs.mkdirSync(path.dirname(tempGpkg), { recursive: true });
    fs.writeFileSync(tempGpkg, 'temp', 'utf8');
    fs.writeFileSync(normalizedGpkg, 'normalized', 'utf8');

    try {
      runBuild(options, sourceFiles);

      expect(execFileSync).toHaveBeenNthCalledWith(
        1,
        'ogrmerge.py',
        [
          '-o',
          tempGpkg,
          '-f',
          'GPKG',
          '-single',
          '-nln',
          'regions',
          '-field_strategy',
          'Union',
          ...sourceFiles,
        ],
        { stdio: 'inherit' }
      );

      expect(execFileSync).toHaveBeenNthCalledWith(
        2,
        'ogr2ogr',
        [
          '-f',
          'GPKG',
          normalizedGpkg,
          tempGpkg,
          'regions',
          '-nln',
          'regions',
          '-nlt',
          'PROMOTE_TO_MULTI',
        ],
        { stdio: 'inherit' }
      );

      expect(execFileSync).toHaveBeenNthCalledWith(
        3,
        'ogr2ogr',
        [
          '-f',
          'MVT',
          outputDir,
          normalizedGpkg,
          'regions',
          '-nln',
          'regions',
          '-dsco',
          'FORMAT=DIRECTORY',
          '-dsco',
          'MINZOOM=3',
          '-dsco',
          'MAXZOOM=12',
        ],
        { stdio: 'inherit' }
      );

      expect(fs.existsSync(tempGpkg)).toBe(false);
      expect(fs.existsSync(normalizedGpkg)).toBe(false);
    } finally {
      fs.rmSync(workspaceDir, { recursive: true, force: true });
    }
  });
});
