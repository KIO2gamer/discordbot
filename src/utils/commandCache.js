/**
 * CommandCache
 * Caching system for command lookups and metadata
 */
class CommandCache {
    constructor(ttl = 5 * 60 * 1000) {
        // Default TTL: 5 minutes
        this.cache = new Map();
        this.ttl = ttl;
    }

    /**
     * Get a cached command
     * @param {string} key - Cache key
     * @returns {any|null}
     */
    get(key) {
        if (!this.cache.has(key)) {
            return null;
        }

        const { value, timestamp } = this.cache.get(key);

        if (Date.now() - timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        return value;
    }

    /**
     * Set a cached value
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     */
    set(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
        });
    }

    /**
     * Check if key exists in cache
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Delete a cached value
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    delete(key) {
        return this.cache.delete(key);
    }

    /**
     * Clear entire cache
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Get cache size
     * @returns {number}
     */
    size() {
        return this.cache.size;
    }

    /**
     * Clean up expired entries
     * @returns {number} Number of entries removed
     */
    cleanup() {
        let removed = 0;
        const now = Date.now();

        for (const [key, { timestamp }] of this.cache) {
            if (now - timestamp > this.ttl) {
                this.cache.delete(key);
                removed++;
            }
        }

        return removed;
    }

    /**
     * Get cache statistics
     * @returns {Object}
     */
    getStats() {
        let totalAge = 0;
        let oldestAge = 0;
        let newestAge = Infinity;
        const now = Date.now();

        for (const [, { timestamp }] of this.cache) {
            const age = now - timestamp;
            totalAge += age;
            oldestAge = Math.max(oldestAge, age);
            newestAge = Math.min(newestAge, age);
        }

        return {
            size: this.cache.size,
            ttl: this.ttl,
            avgAge: this.cache.size > 0 ? totalAge / this.cache.size : 0,
            oldestAge,
            newestAge: newestAge === Infinity ? 0 : newestAge,
        };
    }

    /**
     * Batch get multiple values
     * @param {string[]} keys - Array of keys
     * @returns {Object}
     */
    mget(keys) {
        const result = {};
        keys.forEach((key) => {
            result[key] = this.get(key);
        });
        return result;
    }

    /**
     * Batch set multiple values
     * @param {Object} entries - Object of key-value pairs
     */
    mset(entries) {
        Object.entries(entries).forEach(([key, value]) => {
            this.set(key, value);
        });
    }

    /**
     * Get all entries
     * @returns {Object}
     */
    getAll() {
        const now = Date.now();
        const result = {};

        for (const [key, { value, timestamp }] of this.cache) {
            if (now - timestamp <= this.ttl) {
                result[key] = value;
            } else {
                this.cache.delete(key);
            }
        }

        return result;
    }
}

module.exports = CommandCache;
