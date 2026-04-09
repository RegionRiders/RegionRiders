import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resolveDefaultSourceDir, validateRegionSource } from './validateRegionSource';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'validate-region-source-'));
}

function writeGeoJsonFile(dirPath: string, fileName: string, content: string): void {
  fs.writeFileSync(path.join(dirPath, fileName), content, 'utf8');
}

function createFeatureCollection(regionId: string) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          region_id: regionId,
          country_code: 'PL',
          admin_level: '4',
          name: 'Pomorskie',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [18.0, 54.0],
              [18.1, 54.0],
              [18.1, 54.1],
              [18.0, 54.1],
              [18.0, 54.0],
            ],
          ],
        },
      },
    ],
  };
}

describe('validateRegionSource', () => {
  let sourceDir: string;
  let reportPath: string;

  beforeEach(() => {
    sourceDir = createTempDir();
    reportPath = path.join(createTempDir(), 'report.json');
  });

  afterEach(() => {
    fs.rmSync(sourceDir, { recursive: true, force: true });
    fs.rmSync(path.dirname(reportPath), { recursive: true, force: true });
  });

  it('marks invalid JSON files as invalid in the report', () => {
    writeGeoJsonFile(sourceDir, 'broken.geojson', '{not-json');

    const report = validateRegionSource(sourceDir, reportPath);

    expect(report.isValid).toBe(false);
    expect(report.invalidJsonFiles).toBe(1);
    expect(report.invalidFeatureCollections).toBe(0);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: 'broken.geojson', code: 'invalid_json' }),
      ])
    );

    const writtenReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    expect(writtenReport.isValid).toBe(false);
    expect(writtenReport.invalidJsonFiles).toBe(1);
  });

  it('marks non-feature-collection files as invalid in the report', () => {
    writeGeoJsonFile(
      sourceDir,
      'invalid.geojson',
      JSON.stringify({ type: 'Feature', properties: {}, geometry: null })
    );

    const report = validateRegionSource(sourceDir, reportPath);

    expect(report.isValid).toBe(false);
    expect(report.invalidJsonFiles).toBe(0);
    expect(report.invalidFeatureCollections).toBe(1);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: 'invalid.geojson', code: 'invalid_feature_collection' }),
      ])
    );
  });

  it('keeps valid source files marked valid', () => {
    writeGeoJsonFile(
      sourceDir,
      'valid.geojson',
      JSON.stringify(createFeatureCollection('RR1::PL::POM::001'))
    );

    const report = validateRegionSource(sourceDir, reportPath);

    expect(report.isValid).toBe(true);
    expect(report.invalidJsonFiles).toBe(0);
    expect(report.invalidFeatureCollections).toBe(0);
    expect(report.featuresProcessed).toBe(1);
    expect(report.uniqueRegionIds).toBe(1);
  });

  it('requires an explicit source when REGION_SOURCE_DIR is unset', () => {
    const originalEnv = process.env.REGION_SOURCE_DIR;
    delete process.env.REGION_SOURCE_DIR;

    try {
      expect(() => resolveDefaultSourceDir()).toThrow(
        'No source directory configured. Pass --source <dir> or set REGION_SOURCE_DIR to a GeoJSON dataset directory.'
      );
    } finally {
      if (originalEnv === undefined) {
        delete process.env.REGION_SOURCE_DIR;
      } else {
        process.env.REGION_SOURCE_DIR = originalEnv;
      }
    }
  });
});
