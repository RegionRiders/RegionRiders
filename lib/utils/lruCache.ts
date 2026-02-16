/**
 * Least Recently Used (LRU) Cache with size limits
 * Automatically evicts oldest entries when capacity is reached
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Get value and mark as recently used
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      // Move to end (most recent)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    
    return value;
  }

  /**
   * Set value and evict oldest if needed
   */
  set(key: K, value: V): void {
    // If key exists, delete it first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, value);

    // Evict oldest if over capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Check if key exists
   */
  has(key: K): boolean {
    return this.cache.get(key) !== undefined;
  }

  /**
   * Delete specific key
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * Get all values
   */
  values(): IterableIterator<V> {
    return this.cache.values();
  }

  /**
   * Get all entries
   */
  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }

  /**
   * Iterate over cache
   */
  forEach(callback: (value: V, key: K) => void): void {
    this.cache.forEach(callback);
  }
}

/**
 * LRU Cache with TTL (time-to-live) support
 */
export class LRUCacheWithTTL<K, V> {
  private cache: Map<K, { value: V; timestamp: number }>;
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize: number, ttlMs: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  /**
   * Get value if not expired, mark as recently used
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recent)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.value;
  }

  /**
   * Set value with current timestamp
   */
  set(key: K, value: V): void {
    const entry = { value, timestamp: Date.now() };

    // If key exists, delete it first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, entry);

    // Evict oldest if over capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Check if key exists and not expired
   */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete specific key
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Remove all expired entries
   */
  cleanExpired(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get stats for debugging
   */
  getStats(): { size: number; expired: number } {
    const now = Date.now();
    let expired = 0;

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > this.ttlMs) {
        expired++;
      }
    }

    return { size: this.cache.size, expired };
  }
}
