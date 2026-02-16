/**
 * Central configuration for performance limits and memory management
 */
export const PerformanceConfig = {
  // GPX Loading
  GPX: {
    INITIAL_LOAD_LIMIT: 50, // Load only 50 tracks initially
    MAX_CONCURRENT_LOADS: 5, // Max 5 files loading at once
    CHUNK_SIZE: 25, // Load 25 more when user scrolls/requests
    MAX_CACHED_TRACKS: 200, // LRU eviction after this
    CACHE_TTL_MS: 30 * 60 * 1000, // 30 minutes (reduced from 100)
  },

  // Region Loading
  REGIONS: {
    MAX_CACHED_COUNTRIES: 10, // Max countries in cache
    MAX_CACHED_REGIONS: 5000, // Total region limit
    CACHE_TTL_MS: 30 * 60 * 1000, // 30 minutes
  },

  // Rendering
  RENDERING: {
    VIEWPORT_PADDING: 0.2, // 20% padding around viewport for smooth panning
    MAX_VISIBLE_TRACKS: 500, // Hard limit on rendered tracks
    DEBOUNCE_MS: 300, // Debounce for viewport changes
    MAX_CANVAS_SIZE: 4096, // Max canvas dimension (4K)
  },

  // Analysis
  ANALYSIS: {
    DEBOUNCE_MS: 500, // Debounce region analysis
    MAX_TRACKS_FOR_ANALYSIS: 1000, // Limit tracks analyzed
    USE_WEB_WORKER: false, // Future: move to worker
  },

  // Memory Management
  MEMORY: {
    MAX_HEAP_MB: 800, // Target max heap size
    CHECK_INTERVAL_MS: 10000, // Check memory every 10s
    CLEANUP_THRESHOLD: 0.8, // Cleanup at 80% of max
  },

  // Bounds Checker
  BOUNDS_CACHE: {
    MAX_ENTRIES: 10000, // Max cached bounding boxes
  },
} as const;
