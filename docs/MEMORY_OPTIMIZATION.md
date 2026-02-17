# Memory Optimization Guide

## Overview

This document describes the memory optimization strategies implemented in RegionRiders to handle large datasets efficiently and prevent performance issues.

## Problem Statement

The application can experience high RAM usage and slowdowns when:
- Loading too many GPX tracks simultaneously
- Rendering excessive regions and activities on the map
- Processing large datasets without proper pagination
- Not properly managing component lifecycle and cleanup

## Optimization Strategies

### 1. Progressive Data Loading

#### GPX Tracks
**Limits:**
- Maximum tracks: 100 (configurable in `gpxLoader.ts`)
- Warning threshold: 50 tracks
- Batch size: 10 tracks per batch
- Max concurrent loads: 5 files

**How it works:**
```typescript
// Load tracks in controlled batches
for (let i = 0; i < files.length; i += BATCH_SIZE) {
  const batch = files.slice(i, i + BATCH_SIZE);
  await loadBatchWithConcurrency(batch, MAX_CONCURRENT);
}
```

#### Regions
**Limits:**
- Maximum regions per render: 500 (configurable in `regionRenderer.ts`)
- Warning threshold: 300 regions
- Batch rendering: 50 regions per batch

**Viewport-based filtering:**
```typescript
// Only render regions within visible bounds
const visibleRegions = regions.filter(region => 
  isRegionInViewport(region, map.getBounds())
);
```

### 2. Caching Strategy

#### GPX Cache
- Parsed GPX data is cached to avoid re-parsing
- Cache cleanup on component unmount
- LRU eviction when memory pressure detected

```typescript
// Cache implementation
class GPXCache {
  private cache = new Map<string, GPXTrack>();
  private loading = new Set<string>();
  
  async loadTrack(filename: string): Promise<GPXTrack> {
    if (this.cache.has(filename)) {
      return this.cache.get(filename)!;
    }
    // Load and cache...
  }
}
```

### 3. Map Rendering Optimization

#### Region Rendering
- **Viewport culling**: Only render regions in visible area
- **Batch processing**: Render regions in manageable chunks
- **Debounced updates**: Throttle re-renders during map interactions

#### Layer Management
- Clear previous layers before adding new ones
- Use layer groups for efficient bulk operations
- Remove event listeners on cleanup

```typescript
// Layer cleanup
cleanup() {
  this.clearLayers();
  this.regionRenderer.cleanup();
}
```

### 4. Component Lifecycle Management

#### React Hooks Best Practices
```typescript
// Proper cleanup in useEffect
useEffect(() => {
  const loader = new DataLoader();
  
  return () => {
    loader.cleanup(); // Clean up resources
  };
}, []);
```

#### Memory Leak Prevention
- Remove event listeners on unmount
- Cancel pending async operations
- Clear intervals and timeouts
- Dispose of map instances properly

## Configuration

### Adjusting Limits

Edit these constants in respective files:

**GPX Loader** (`lib/services/DataLoader/gpxLoader.ts`):
```typescript
private static readonly MAX_TRACKS_TO_LOAD = 100;
private static readonly WARN_THRESHOLD = 50;
private static readonly BATCH_SIZE = 10;
private static readonly MAX_CONCURRENT = 5;
```

**Region Renderer** (`lib/services/Rendering/regionRenderer.ts`):
```typescript
private static readonly MAX_REGIONS_TO_RENDER = 500;
private static readonly WARN_THRESHOLD = 300;
private static readonly BATCH_SIZE = 50;
```

### Server-Side Considerations

When migrating to server-fetched data:

1. **Implement pagination** on API endpoints
   ```typescript
   GET /api/tracks?page=1&limit=20
   GET /api/regions?bounds=north,south,east,west
   ```

2. **Use streaming responses** for large datasets
   ```typescript
   // Stream JSON data incrementally
   const stream = await fetch('/api/tracks/stream');
   const reader = stream.body.getReader();
   ```

3. **Implement server-side filtering**
   - Filter by date range
   - Filter by geographic bounds
   - Filter by activity type

4. **Add caching headers**
   ```typescript
   Cache-Control: public, max-age=3600
   ETag: "version-hash"
   ```

## Monitoring

### Built-in Logging

The application includes component-specific loggers:

```typescript
const logger = createComponentLogger('GPXLoader');
logger.info(`Loaded ${tracks.size} tracks in ${duration}ms`);
logger.warn(`Large track count: ${tracks.size} tracks`);
```

### Performance Metrics

Access statistics via:

```typescript
// GPX Loader stats
const stats = GPXLoader.getCacheStats();
console.log(stats);
// { cachedTracks, loadingTracks, maxTracks, warnThreshold }

// Region Renderer stats
const renderStats = RegionRenderer.getStats();
console.log(renderStats);
// { totalRegions, renderedRegions, maxRegions, warnThreshold }
```

### Browser DevTools

1. **Memory profiler**: Check heap snapshots for leaks
2. **Performance tab**: Record and analyze rendering performance
3. **Console warnings**: Watch for limit warnings

## Warning Signs

### High Memory Usage
- Console warnings about track/region limits
- Browser tab becoming unresponsive
- Slow map interactions (panning, zooming)
- Increasing heap size over time

### Performance Degradation
- Frame drops during map rendering
- Delayed response to user interactions
- Long initial load times (>5 seconds)

## Debugging Guide

### Check Current Load
```typescript
// In browser console
GPXLoader.getCacheStats();
RegionRenderer.getStats();
```

### Clear Caches
```typescript
GPXLoader.clearCache();
RegionRenderer.clearCache();
```

### Enable Verbose Logging
```typescript
// In logger configuration
setLogLevel('debug'); // Show all debug messages
```

### Profile Memory
1. Open Chrome DevTools → Memory tab
2. Take heap snapshot before loading data
3. Load data and interact with map
4. Take second heap snapshot
5. Compare snapshots to identify leaks

## Best Practices

### For Developers

1. **Always implement cleanup**
   ```typescript
   useEffect(() => {
     // Setup
     return () => {
       // Cleanup
     };
   }, []);
   ```

2. **Use progressive loading**
   - Don't load all data at once
   - Implement "load more" functionality
   - Use infinite scroll patterns

3. **Debounce expensive operations**
   ```typescript
   const debouncedUpdate = useMemo(
     () => debounce(updateMap, 300),
     []
   );
   ```

4. **Monitor performance in development**
   - Check console for warnings
   - Use React DevTools Profiler
   - Test with realistic data volumes

### For Users

1. **Limit visible data**
   - Use date range filters
   - Use geographic filters
   - Toggle off unnecessary layers

2. **Browser recommendations**
   - Use modern browsers (Chrome 90+, Firefox 88+)
   - Close unnecessary tabs
   - Ensure adequate RAM (8GB+ recommended)

3. **Clear cache periodically**
   - Use app settings to clear cache
   - Refresh page to reset state

## Future Improvements

### Short-term
- [ ] Implement virtual scrolling for lists
- [ ] Add data prefetching for smoother UX
- [ ] Implement more aggressive cache eviction
- [ ] Add memory usage dashboard

### Medium-term
- [ ] Server-side rendering for initial load
- [ ] Implement service worker for offline caching
- [ ] Add Web Worker for background processing
- [ ] Implement incremental data loading

### Long-term
- [ ] Implement server-side filtering and pagination
- [ ] Add CDN caching for static GPX files
- [ ] Implement data compression
- [ ] Add performance monitoring (e.g., Sentry)

## Related Files

- `lib/services/DataLoader/gpxLoader.ts` - GPX loading with limits
- `lib/services/Rendering/regionRenderer.ts` - Region rendering optimization
- `lib/services/cache/gpxCache.ts` - GPX caching layer
- `lib/logger/client.ts` - Component logging
- `components/map/MapView.tsx` - Map component with cleanup

## References

- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Leaflet Performance Tips](https://leafletjs.com/examples/quick-start/)
- [Web Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [Memory Management in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_management)
