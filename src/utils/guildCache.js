/**
 * Shared in-memory TTL cache for frequently-accessed, rarely-changing guild data.
 * Prevents redundant DB hits on every message event.
 *
 * Usage:
 *   const { getGuildSettings, invalidateGuildSettings } = require("../utils/guildCache");
 *   const settings = await getGuildSettings(guildId);
 */

const { GuildSettingsSchema } = require("../database/GuildSettingsSchema");
const AutoModConfig = require("../database/autoModConfig");

// TTL in ms – guild settings change rarely, 5 minutes is safe
const SETTINGS_TTL = 5 * 60 * 1000;
const AUTOMOD_TTL = 5 * 60 * 1000;

// { guildId -> { value, expiresAt } }
const settingsCache = new Map();
const autoModCache = new Map();

// Periodic cache sweep – evict expired entries to prevent unbounded growth
setInterval(
    () => {
        const now = Date.now();
        for (const [key, entry] of settingsCache) {
            if (entry.expiresAt <= now) settingsCache.delete(key);
        }
        for (const [key, entry] of autoModCache) {
            if (entry.expiresAt <= now) autoModCache.delete(key);
        }
    },
    10 * 60 * 1000,
); // sweep every 10 minutes

/**
 * Returns guild settings from cache, or fetches from DB and caches the result.
 * Returns null when no document exists (same as findOne returning null).
 */
async function getGuildSettings(guildId) {
    const now = Date.now();
    const cached = settingsCache.get(guildId);
    if (cached && cached.expiresAt > now) return cached.value;

    const value = await GuildSettingsSchema.findOne({ guildId }).lean();
    settingsCache.set(guildId, { value, expiresAt: now + SETTINGS_TTL });
    return value;
}

/**
 * Returns auto-mod config from cache, or fetches from DB and caches the result.
 */
async function getAutoModConfig(guildId) {
    const now = Date.now();
    const cached = autoModCache.get(guildId);
    if (cached && cached.expiresAt > now) return cached.value;

    const value = await AutoModConfig.findOne({ guildId }).lean();
    autoModCache.set(guildId, { value, expiresAt: now + AUTOMOD_TTL });
    return value;
}

/**
 * Call this whenever guild settings are updated so the next read hits the DB.
 */
function invalidateGuildSettings(guildId) {
    settingsCache.delete(guildId);
}

/**
 * Call this whenever auto-mod config is updated.
 */
function invalidateAutoModConfig(guildId) {
    autoModCache.delete(guildId);
}

module.exports = {
    getGuildSettings,
    getAutoModConfig,
    invalidateGuildSettings,
    invalidateAutoModConfig,
};
