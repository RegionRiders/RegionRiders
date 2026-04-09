# Region Tiles v1 Runbook

This runbook defines how to validate source region data, generate local vector tiles for the current Leaflet VectorGrid
integration, configure the runtime tile source, and measure release gates.

## Scope

- Profile: balanced source dataset
- Source directory: `~/rr_import_20260325/mobile_geojson_balanced`
- Output directory: `public/data/regions/tiles/v1`
- Layer name in tiles: `regions`
- Current release scope: **tile infrastructure only**
- Current tile artifacts should be treated as a **draft / interim render** for development and internal validation
- Final production tiles are expected to be **re-rendered** before public release

## 1) Validate source data

Run:

```bash
npm run regions:validate-source
```

Validation checks:

- `region_id` is present and unique across all source files
- required properties are present: `region_id`, `country_code`, `admin_level`, `name`
- geometry is not empty

Output:

- JSON report: `public/data/regions/reports/source-validation-v1.json`
- command exits non-zero if duplicates/missing properties/invalid geometries are detected

## 2) Build tiles

Run full prepare flow (validation + build):

```bash
npm run regions:prepare-v1
```

Note: this command is intentionally gated. If validation fails, tile build does not start.

Or build only:

```bash
npm run regions:build-tiles -- --force
```

Build behavior:

- merges all `*.geojson` files from source into one `regions` layer
- generates MVT directory tiles with zoom range `3..14`
- rewrites output directory when `--force` is used
- current runtime region overlay profiles intentionally stop requesting region tiles above zoom `12`
- keeping build output through zoom `14` preserves headroom for offline inspection and future hosting changes without changing the current runtime contract

## 3) Smoke checks

After tile build:

1. verify `public/data/regions/tiles/v1/metadata.json` exists
2. verify `metadata.json` contains vector layer id `regions`
3. run app and inspect network for the configured region tile source:
   - `NEXT_PUBLIC_REGION_TILE_URL` when set
   - otherwise `https://rr-tiles.404fra.pl/v1/{z}/{x}/{y}.pbf`
4. confirm tiles expose the `regions` layer and `region_id` feature property
5. confirm there are no recurring `tileerror` logs

Missing-tile behavior:

- the local API returns `204 No Content` for missing tile files
- `leaflet.vectorgrid` treats non-error HTTP fetch results as an empty vector tile response rather than a transport failure, so sparse/missing tiles do not need to trip degraded-mode UI by themselves
- keep the `tileerror` banner reserved for true transport/runtime failures such as host unavailability or fetch rejection

## 4) KPI acceptance thresholds

These thresholds are release gates for v1 local tiles.

- first region paint:
  - desktop p95 <= 1.2s
  - mobile mid-tier p95 <= 2.2s
- pan/zoom smoothness:
  - desktop median >= 55 FPS, no freeze >250ms
  - mobile median >= 40 FPS, no freeze >350ms
- tile payload size (compressed transfer):
  - p50 <= 60KB
  - p95 <= 150KB
- tile error rate: < 0.5%
- no regressions in activity overlays:
  - heatmap
  - lines
  - hover interactions
- visited/unvisited runtime styling is explicitly out of scope for this release and handled by follow-up work on server-side region statuses

## 5) Measurement protocol

Use this protocol for each candidate build.

1. Use the same branch and fixed tile source (`v1`) for all runs.
2. Hard-refresh before each run to clear runtime cache noise.
3. Capture at least 30 map-start samples per device class.
4. Desktop profile:
   - Chromium latest, non-throttled CPU/network
   - viewport 1440x900
5. Mobile profile:
   - Chrome Android (mid-tier hardware)
   - default network, battery saver off
6. Record first-region-paint from app logs/telemetry.
7. Record FPS/freezes with browser performance tooling during scripted pan/zoom.
8. Export network request table and compute tile size p50/p95 and error rate.
9. Keep report artifacts with timestamp and git commit SHA.

## Notes

- Current scripts rely on GDAL tools (`ogrmerge.py`, `ogr2ogr`) being installed.
- Source dataset defaults for `regions:validate-source` and `regions:build-tiles` are resolved in this order:
  - `--source`
  - `REGION_SOURCE_DIR`
  - otherwise the command fails and requires an explicit source path
- Runtime rendering expects vector tile layer `regions` with stable `region_id` values.
- Runtime rendering currently requests region tiles only through zoom `12` even though the build tooling can pre-generate up to `14`; this is an intentional performance cap for the current shipped overlay profiles.
- Visited/unvisited styling is not part of the current release scope; the production path intentionally ships tile rendering infrastructure first, with server-side status delivery tracked separately in follow-up work (`#188`).
- Region overlay failures are non-fatal: the overlay can be disabled while the basemap and activity layers remain available.
- The runbook intentionally excludes legacy GeoJSON runtime fallback.
- The currently hosted/generated tile set should be treated as a draft render for iteration; expect a clean re-render before production rollout.

## Hosting and distribution strategy

- Runtime path classification:
  - primary runtime source:
    - `NEXT_PUBLIC_REGION_TILE_URL` when set
    - otherwise `https://rr-tiles.404fra.pl/v1/{z}/{x}/{y}.pbf`
    - CSP `connect-src` must allow the resolved tile origin; the app now derives that allowlist from `NEXT_PUBLIC_REGION_TILE_URL` when it is an absolute URL
  - alternate / self-host runtime source:
    - `/api/regions/tiles/v1/{z}/{x}/{y}.pbf`
    - this serves tiles from local artifacts in `public/data/regions/tiles/v1`
  - local artifact path:
    - `public/data/regions/tiles/v1`
    - intended for local build output and self-host/API serving, not as the default remote production origin

- For VPS-first deployment with Dokku (and later CDN migration), see:
  - `docs/architecture/tile-hosting-migration-plan.md`
- Repository policy: large tile artifacts should not be source-controlled in the app repo.
- Local optimization note: current in-repo sample may include only a main chunk (e.g. `z=11`) for development/testing;
  full production tile set should be deployed from external artifact storage.
