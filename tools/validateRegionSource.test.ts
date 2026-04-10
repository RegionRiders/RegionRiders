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

function createFeatureCollectionWithProperties(properties: Record<string, unknown>) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          country_code: 'PL',
          admin_level: '4',
          name: 'Pomorskie',
          ...properties,
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

  it('marks numeric region_id values as invalid', () => {
    writeGeoJsonFile(
      sourceDir,
      'numeric-id.geojson',
      JSON.stringify(createFeatureCollectionWithProperties({ region_id: 1234 }))
    );

    const report = validateRegionSource(sourceDir, reportPath);

    expect(report.isValid).toBe(false);
    expect(report.missingRequiredFields).toBe(1);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: 'numeric-id.geojson', code: 'invalid_region_id' }),
      ])
    );
  });

  it('detects duplicate region_id values after normalization', () => {
    writeGeoJsonFile(
      sourceDir,
      'a.geojson',
      JSON.stringify(createFeatureCollectionWithProperties({ region_id: 'RR1::PL::POM::001' }))
    );
    writeGeoJsonFile(
      sourceDir,
      'b.geojson',
      JSON.stringify(createFeatureCollectionWithProperties({ region_id: 'RR1::PL::POM::001 ' }))
    );

    const report = validateRegionSource(sourceDir, reportPath);

    expect(report.isValid).toBe(false);
    expect(report.duplicateRegionIds).toBe(1);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: 'b.geojson', code: 'duplicate_region_id' }),
      ])
    );
  });

  it('marks empty region_id values as missing required data', () => {
    writeGeoJsonFile(
      sourceDir,
      'empty-id.geojson',
      JSON.stringify(createFeatureCollectionWithProperties({ region_id: '   ' }))
    );

    const report = validateRegionSource(sourceDir, reportPath);

    expect(report.isValid).toBe(false);
    expect(report.missingRequiredFields).toBeGreaterThan(0);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: 'empty-id.geojson', code: 'invalid_region_id' }),
      ])
    );
  });

  it('marks missing region_id values as missing required data', () => {
    writeGeoJsonFile(
      sourceDir,
      'missing-id.geojson',
      JSON.stringify(createFeatureCollectionWithProperties({ region_id: undefined }))
    );

    const report = validateRegionSource(sourceDir, reportPath);

    expect(report.isValid).toBe(false);
    expect(report.missingRequiredFields).toBe(1);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: 'missing-id.geojson', code: 'missing_required_property' }),
      ])
    );
  });
});
