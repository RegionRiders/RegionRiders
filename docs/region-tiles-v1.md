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
- keeping build output through zoom `14` preserves headroom for offline inspection and future hosting changes without
  changing the current runtime contract

## 3) Smoke checks

After tile build:

1. verify `public/data/regions/tiles/v1/metadata.json` exists
2. verify `metadata.json` contains vector layer id `regions`
3. run app and inspect network for the configured region tile source:
    - `NEXT_PUBLIC_REGION_TILE_URL` when set
    - otherwise `https://rr-tiles.404fra.pl/v1/{z}/{x}/{y}.pbf`
4. confirm tiles expose the `regions` layer and `region_id` feature property
5. confirm zooming above zoom 12 keeps the region overlay visible instead of dropping it entirely
6. confirm the overlay is still using zoom 12 quality above zoom 12 rather than fetching higher-detail geometry
7. confirm zoomed-out browsing does not show obviously broken border cracks or holes beyond the expected low-LoD
   simplification
8. confirm there are no recurring `tileerror` logs

Runtime hardening checks:

- watch the app log for the exact `First region layer paint` entry during each fresh-load sample
- zoom from 4 -> 12 -> 18 and verify the overlay remains present after zoom 12 while staying at zoom 12 detail
- pan aggressively at low zoom after the overscaled high-zoom pass and confirm the region border treatment still looks
  coherent

Missing-tile behavior:

- the local API returns `204 No Content` for missing tile files
- `leaflet.vectorgrid` treats non-error HTTP fetch results as an empty vector tile response rather than a transport
  failure, so sparse/missing tiles do not need to trip degraded-mode UI by themselves
- keep the `tileerror` banner reserved for true transport/runtime failures such as host unavailability or fetch
  rejection

## 3a) Phase 2 review-fix validation loop

Run this checklist after the Phase 1 smoke checks when validating the current `PR #161` review-fix branch.

1. Exercise normal zoom interactions with the region overlay visible:
    - zoom `4 -> 12 -> 18`
    - confirm the overlay stays visibly present through the full zoom interactions path
    - confirm the overlay does not appear to tear down and reappear mid-gesture or immediately after zoom settles
2. Validate no-`blank-gap` style updates with the current live layer:
    - change region transparency repeatedly
    - change region border thickness
    - switch region mode between static and heatmap
    - confirm each settings change restyles the existing overlay in place instead of showing a blank-gap before the
      updated style appears
3. Validate the current placeholder fill semantics:
    - keep the current placeholder `visitData` boundary empty
    - switch to static mode and edit the unvisited swatch alpha to a clearly visible value, including the full-alpha case
    - confirm the unvisited swatch edit drives a visibly filled placeholder polygon on the live VectorGrid path rather
      than only changing the outline color
    - move the region transparency slider between low and high values
    - confirm the placeholder base fill remains materially visible and scales with both the edited unvisited alpha and
      the transparency slider even though backend visited-status delivery is still deferred
4. Validate non-fatal overlay error handling during the same pass:
    - if a real transport/runtime failure occurs, confirm the non-fatal overlay status is shown
    - confirm the basemap, activity layers, and map shell remain usable while the status is present

Phase 2 out-of-scope reminders:

- Large-area low-zoom overload and LoD redesign remain deferred to issue `#196`
- Country-to-country border-detail inconsistency in the current draft source tiles remains a data-quality concern, not
  a Phase 2 runtime acceptance item
- Seam/grid mitigation remains out of scope for this validation pass
- Backend visited-status delivery remains deferred; this branch only validates the placeholder styling path

## 4) KPI acceptance thresholds

These thresholds are release gates for v1 local tiles.

- first region paint:
    - desktop p95 <= 1.2s
    - mobile mid-tier p95 <= 2.2s
- pan/zoom smoothness:
    - desktop median >= 55 FPS, no freeze >250ms
    - mobile median >= 40 FPS, no freeze >350ms
- zoom-cap behavior:
    - zoom 12 remains the effective detail ceiling for region geometry
    - zoom > 12 keeps the overlay visible through overscaled rendering rather than hiding it
- phase 2 review-fix behavior:
    - zoom interactions keep the current overlay visibly present
    - style-only changes to transparency, border thickness, and mode do not create a blank-gap transition
    - the placeholder base fill stays visibly present as a real polygon fill, including the full-alpha unvisited swatch
      case, and responds to edited unvisited alpha plus the transparency slider while visited-status remains deferred
- low-LoD coherence:
    - zoomed-out browsing should minimize obvious border cracks even when detail is reduced
- tile payload size (compressed transfer):
    - p50 <= 60KB
    - p95 <= 150KB
- tile error rate: < 0.5%
- no regressions in activity overlays:
    - heatmap
    - lines
    - hover interactions
- visited/unvisited runtime styling is explicitly out of scope for this release and handled by follow-up work on
  server-side region statuses

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
7. Record FPS/freezes with browser performance tooling during scripted pan/zoom, including a zoom 12 -> 18 pass and a
   zoomed-out sweep.
8. Confirm the `First region layer paint` log appears once per fresh-load sample after map readiness.
9. Inspect requests during the zoom 12 -> 18 pass and confirm the region overlay keeps rendering without climbing past
   the zoom 12 detail contract.
10. Export network request table and compute tile size p50/p95 and error rate.
11. Keep report artifacts with timestamp and git commit SHA.

## Notes

- Current scripts rely on GDAL tools (`ogrmerge.py`, `ogr2ogr`) being installed.
- Source dataset defaults for `regions:validate-source` and `regions:build-tiles` are resolved in this order:
    - `--source`
    - `REGION_SOURCE_DIR`
    - otherwise the command fails and requires an explicit source path
- Runtime rendering expects vector tile layer `regions` with stable `region_id` values.
- Runtime rendering now treats zoom `12` as the detail cap while still allowing the user to browse above it; overscaled
  rendering above zoom `12` should stay visible without requesting extra geometric fidelity.
- Visited/unvisited styling is not part of the current release scope; the production path intentionally ships tile
  rendering infrastructure first, with server-side status delivery tracked separately in follow-up work (`#188`).
- Phase 2 validation is limited to zoom stability, in-place restyling, and placeholder fill/transparency behavior on
  the current client-side path.
- Validation should not treat issue `#196`, seam/grid mitigation, or source tile-detail inconsistency as regressions in
  this runbook unless the scope of the branch changes explicitly.
- Region overlay failures are non-fatal: the overlay can be disabled while the basemap and activity layers remain
  available.
- The runbook intentionally excludes legacy GeoJSON runtime fallback.
- The currently hosted/generated tile set should be treated as a draft render for iteration; expect a clean re-render
  before production rollout.

## Hosting and distribution strategy

- Runtime path classification:
    - primary runtime source:
        - `NEXT_PUBLIC_REGION_TILE_URL` when set
        - otherwise `https://rr-tiles.404fra.pl/v1/{z}/{x}/{y}.pbf`
        - CSP `connect-src` must allow the resolved tile origin; the app now derives that allowlist from
          `NEXT_PUBLIC_REGION_TILE_URL` when it is an absolute URL
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
