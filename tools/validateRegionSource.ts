#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';

interface ValidationIssue {
  file: string;
  featureIndex?: number;
  regionId?: string;
  code: string;
  message: string;
}

interface ValidationReport {
  generatedAt: string;
  sourceDir: string;
  filesProcessed: number;
  featuresProcessed: number;
  uniqueRegionIds: number;
  duplicateRegionIds: number;
  missingRequiredFields: number;
  invalidGeometries: number;
  issues: ValidationIssue[];
  isValid: boolean;
}

const REQUIRED_PROPERTIES = ['region_id', 'country_code', 'admin_level', 'name'] as const;

const DEFAULT_SOURCE_DIR = '../public/data/rr_import/mobile_geojson_balanced';
const DEFAULT_REPORT_PATH = '../public/data/regions/reports/source-validation-v1.json';
const MAX_ISSUES = 500;

function getArgValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function addIssue(issues: ValidationIssue[], issue: ValidationIssue): void {
  if (issues.length >= MAX_ISSUES) {
    return;
  }

  issues.push(issue);
}

function hasAnyCoordinate(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }

  if (typeof value[0] === 'number') {
    return value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1]);
  }

  return value.some((entry) => hasAnyCoordinate(entry));
}

function geometryIsNonEmpty(geometry: unknown): boolean {
  if (!geometry || typeof geometry !== 'object') {
    return false;
  }

  const maybeGeometry = geometry as {
    type?: string;
    coordinates?: unknown;
    geometries?: unknown[];
  };

  if (maybeGeometry.type === 'GeometryCollection') {
    return Array.isArray(maybeGeometry.geometries)
      ? maybeGeometry.geometries.some((item) => geometryIsNonEmpty(item))
      : false;
  }

  return hasAnyCoordinate(maybeGeometry.coordinates);
}

function ensureDirForFile(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function main(): void {
  const sourceDir = getArgValue('--source') ?? DEFAULT_SOURCE_DIR;
  const reportPath = getArgValue('--report') ?? DEFAULT_REPORT_PATH;

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source directory does not exist: ${sourceDir}`);
  }

  const files = fs
    .readdirSync(sourceDir)
    .filter((name) => name.endsWith('.geojson'))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    throw new Error(`No .geojson files found in ${sourceDir}`);
  }

  const issues: ValidationIssue[] = [];
  const seenRegionIds = new Map<string, string>();
  let featuresProcessed = 0;
  let duplicateRegionIds = 0;
  let missingRequiredFields = 0;
  let invalidGeometries = 0;

  for (const fileName of files) {
    const filePath = path.join(sourceDir, fileName);
    const raw = fs.readFileSync(filePath, 'utf8');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      addIssue(issues, {
        file: fileName,
        code: 'invalid_json',
        message: `Could not parse JSON: ${String(error)}`,
      });
      continue;
    }

    const collection = parsed as { type?: string; features?: unknown[] };

    if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
      addIssue(issues, {
        file: fileName,
        code: 'invalid_feature_collection',
        message: 'File is not a valid GeoJSON FeatureCollection',
      });
      continue;
    }

    collection.features.forEach((featureRaw, featureIndex) => {
      const feature = featureRaw as { properties?: Record<string, unknown>; geometry?: unknown };
      const properties = feature.properties ?? {};
      featuresProcessed += 1;

      const missingProps = REQUIRED_PROPERTIES.filter((key) => {
        const value = properties[key];
        return value === undefined || value === null || value === '';
      });

      if (missingProps.length > 0) {
        missingRequiredFields += 1;
        addIssue(issues, {
          file: fileName,
          featureIndex,
          code: 'missing_required_property',
          message: `Missing properties: ${missingProps.join(', ')}`,
        });
      }

      const regionIdValue = properties.region_id;
      if (typeof regionIdValue === 'string' && regionIdValue.length > 0) {
        const firstSeenIn = seenRegionIds.get(regionIdValue);
        if (firstSeenIn) {
          duplicateRegionIds += 1;
          addIssue(issues, {
            file: fileName,
            featureIndex,
            regionId: regionIdValue,
            code: 'duplicate_region_id',
            message: `region_id already seen in ${firstSeenIn}`,
          });
        } else {
          seenRegionIds.set(regionIdValue, fileName);
        }
      }

      if (!geometryIsNonEmpty(feature.geometry)) {
        invalidGeometries += 1;
        addIssue(issues, {
          file: fileName,
          featureIndex,
          regionId: typeof regionIdValue === 'string' ? regionIdValue : undefined,
          code: 'invalid_geometry',
          message: 'Geometry is null or has empty coordinates',
        });
      }
    });
  }

  const report: ValidationReport = {
    generatedAt: new Date().toISOString(),
    sourceDir,
    filesProcessed: files.length,
    featuresProcessed,
    uniqueRegionIds: seenRegionIds.size,
    duplicateRegionIds,
    missingRequiredFields,
    invalidGeometries,
    issues,
    isValid: duplicateRegionIds === 0 && missingRequiredFields === 0 && invalidGeometries === 0,
  };

  ensureDirForFile(reportPath);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`Validation report saved to ${reportPath}`);
  console.log(
    [
      `files=${report.filesProcessed}`,
      `features=${report.featuresProcessed}`,
      `uniqueRegionIds=${report.uniqueRegionIds}`,
      `duplicates=${report.duplicateRegionIds}`,
      `missingRequiredFields=${report.missingRequiredFields}`,
      `invalidGeometries=${report.invalidGeometries}`,
      `valid=${report.isValid}`,
    ].join(' ')
  );

  if (!report.isValid) {
    process.exitCode = 1;
  }
}

main();
