const { Events } = require("discord.js");
const { LevelSchema } = require("../database/xp_data");
const { getGuildSettings } = require("../utils/guildCache");
const Logger = require("../utils/logger");

// Voice XP settings
const VOICE_XP_PER_MINUTE = 5; // Base XP per minute in voice
const VOICE_XP_INTERVAL = 60000; // Award XP every 60 seconds
const MIN_VOICE_DURATION = 30000; // Minimum 30 seconds to count

// Track voice sessions
const voiceSessions = new Map();

// Interval for awarding voice XP and cleaning up stale sessions
setInterval(async () => {
    try {
        // Remove sessions that have been active for over 24 hours (abnormal disconnect)
        const staleThreshold = Date.now() - 24 * 60 * 60 * 1000;
        for (const [key, session] of voiceSessions) {
            if (session.joinedAt < staleThreshold) voiceSessions.delete(key);
        }

        await awardVoiceXP();
    } catch (error) {
        Logger.log("VOICE_XP", `Error awarding voice XP: ${error.message}`, "error");
    }
}, VOICE_XP_INTERVAL);

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const userId = newState.id;
        const guildId = newState.guild.id;

        try {
            // Check if leveling is enabled
            const guildSettings = await getGuildSettings(guildId);
            if (!guildSettings || !guildSettings.leveling || !guildSettings.leveling.enabled) {
                return;
            }

            // User joined a voice channel
            if (!oldState.channelId && newState.channelId) {
                await handleVoiceJoin(userId, guildId, newState);
            }
            // User left a voice channel
            else if (oldState.channelId && !newState.channelId) {
                await handleVoiceLeave(userId, guildId);
            }
            // User switched channels
            else if (oldState.channelId !== newState.channelId) {
                await handleVoiceLeave(userId, guildId);
                await handleVoiceJoin(userId, guildId, newState);
            }
            // Check for mute/deafen state changes
            else {
                await handleStateChange(userId, guildId, oldState, newState);
            }
        } catch (error) {
            Logger.log("VOICE_XP", `Error in voice state update: ${error.message}`, "error");
        }
    },
};

async function handleVoiceJoin(userId, guildId, state) {
    // Don't award XP if user is muted or deafened
    if (state.selfMute || state.selfDeaf || state.serverMute || state.serverDeaf) {
        return;
    }

    // Don't award XP in AFK channels
    if (state.channel.id === state.guild.afkChannelId) {
        return;
    }

    const sessionKey = `${userId}-${guildId}`;
    voiceSessions.set(sessionKey, {
        joinedAt: Date.now(),
        channelId: state.channelId,
        guildId: guildId,
    });

    // Update database with join time
    await LevelSchema.findOneAndUpdate(
        { userId, guildId },
        {
            $set: {
                voiceJoinedAt: new Date(),
                voiceChannelId: state.channelId,
            },
            $inc: { voiceSessions: 1 },
        },
        { upsert: true },
    );

    Logger.log(
        "VOICE_XP",
        `User ${userId} joined voice channel ${state.channelId} in guild ${guildId}`,
        "debug",
    );
}

async function handleVoiceLeave(userId, guildId) {
    const sessionKey = `${userId}-${guildId}`;
    const session = voiceSessions.get(sessionKey);

    if (!session) return;

    const duration = Date.now() - session.joinedAt;

    // Only award XP if they were in voice for at least the minimum duration
    if (duration >= MIN_VOICE_DURATION) {
        const minutes = Math.floor(duration / 60000);
        await awardVoiceXPToUser(userId, guildId, minutes);
    }

    voiceSessions.delete(sessionKey);

    // Clear voice tracking in database
    await LevelSchema.findOneAndUpdate(
        { userId, guildId },
        {
            $set: {
                voiceJoinedAt: null,
                voiceChannelId: null,
            },
        },
    );

    Logger.log(
        "VOICE_XP",
        `User ${userId} left voice channel after ${Math.floor(duration / 1000)}s`,
        "debug",
    );
}

async function handleStateChange(userId, guildId, oldState, newState) {
    const sessionKey = `${userId}-${guildId}`;
    const isMutedOrDeafened =
        newState.selfMute || newState.selfDeaf || newState.serverMute || newState.serverDeaf;
    const wasActive = voiceSessions.has(sessionKey);

    // If user became muted/deafened, end their session
    if (isMutedOrDeafened && wasActive) {
        await handleVoiceLeave(userId, guildId);
    }
    // If user unmuted/undeafened, start tracking again
    else if (!isMutedOrDeafened && !wasActive && newState.channelId) {
        await handleVoiceJoin(userId, guildId, newState);
    }
}

async function awardVoiceXP() {
    const now = Date.now();

    for (const [sessionKey, session] of voiceSessions.entries()) {
        try {
            const duration = now - session.joinedAt;

            // Award XP every interval (1 minute)
            if (duration >= VOICE_XP_INTERVAL) {
                const [userId, guildId] = sessionKey.split("-");
                const minutes = 1; // Award for 1 minute at a time

                await awardVoiceXPToUser(userId, guildId, minutes);

                // Reset the join time for the next interval
                session.joinedAt = now;
            }
        } catch (error) {
            Logger.log(
                "VOICE_XP",
                `Error processing session ${sessionKey}: ${error.message}`,
                "error",
            );
        }
    }
}

async function awardVoiceXPToUser(userId, guildId, minutes) {
    try {
        // Get guild settings for XP rate
        const guildSettings = await getGuildSettings(guildId);
        const xpRate = guildSettings?.leveling?.xpRate || 1.0;

        // Get user data for boost multiplier
        let levelData = await LevelSchema.findOne({ userId, guildId });
        if (!levelData) {
            levelData = new LevelSchema({ userId, guildId });
        }

        // Calculate boost multiplier
        let boostMultiplier = 1.0;
        if (
            levelData.xpBoost &&
            levelData.xpBoost.expiresAt &&
            new Date() < levelData.xpBoost.expiresAt
        ) {
            boostMultiplier = levelData.xpBoost.multiplier || 1.0;
        }

        // Calculate XP to award
        const baseXP = VOICE_XP_PER_MINUTE * minutes;
        const xpToAdd = Math.floor(baseXP * xpRate * boostMultiplier);

        const oldLevel = levelData.level;

        // Update XP and voice time
        levelData.xp += xpToAdd;
        levelData.totalXp += xpToAdd;
        levelData.voiceTime += minutes;

        // Check for level up
        let leveledUp = false;
        while (levelData.xp >= calculateXpForNextLevel(levelData.level)) {
            levelData.level++;
            leveledUp = true;
        }

        await levelData.save();

        Logger.log(
            "VOICE_XP",
            `Awarded ${xpToAdd} voice XP to user ${userId} in guild ${guildId}`,
            "debug",
        );

        // Handle level up if applicable
        if (leveledUp && guildSettings) {
            await handleVoiceLevelUp(userId, guildId, levelData, oldLevel, guildSettings);
        }

        // Check for achievements
        await checkVoiceAchievements(levelData);
    } catch (error) {
        Logger.log("VOICE_XP", `Error awarding XP to user ${userId}: ${error.message}`, "error");
    }
}

function calculateXpForNextLevel(currentLevel) {
    return 100 + currentLevel * 50;
}

async function handleVoiceLevelUp(userId, guildId, levelData, oldLevel, guildSettings) {
    try {
        // Similar to text level up, but we can't send a message in voice context
        // We can only assign role rewards
        const newLevel = levelData.level;

        // Check for role rewards
        if (guildSettings.leveling.roleRewards && guildSettings.leveling.roleRewards.length > 0) {
            const roleReward = guildSettings.leveling.roleRewards.find((r) => r.level === newLevel);

            if (roleReward) {
                // We need to get the guild and member to assign the role
                const { client } = require("../index");
                const guild = await client.guilds.fetch(guildId);
                const member = await guild.members.fetch(userId).catch(() => null);

                if (member) {
                    const role = guild.roles.cache.get(roleReward.roleId);
                    if (role && guild.members.me.permissions.has("ManageRoles")) {
                        await member.roles.add(role, "Voice level reward");
                        Logger.log(
                            "VOICE_XP",
                            `Assigned role ${role.name} to ${userId} for reaching level ${newLevel}`,
                            "info",
                        );
                    }
                }
            }
        }
    } catch (error) {
        Logger.log("VOICE_XP", `Error in voice level up handler: ${error.message}`, "error");
    }
}

async function checkVoiceAchievements(levelData) {
    const newAchievements = [];

    // Voice achievements
    if (levelData.voiceTime >= 60 && !levelData.achievements.includes("voice_1hour")) {
        newAchievements.push("voice_1hour");
    }
    if (levelData.voiceTime >= 600 && !levelData.achievements.includes("voice_10hours")) {
        newAchievements.push("voice_10hours");
    }
    if (levelData.voiceTime >= 6000 && !levelData.achievements.includes("voice_100hours")) {
        newAchievements.push("voice_100hours");
    }
    if (levelData.voiceSessions >= 10 && !levelData.achievements.includes("voice_sessions_10")) {
        newAchievements.push("voice_sessions_10");
    }
    if (levelData.voiceSessions >= 100 && !levelData.achievements.includes("voice_sessions_100")) {
        newAchievements.push("voice_sessions_100");
    }

    if (newAchievements.length > 0) {
        levelData.achievements.push(...newAchievements);
        await levelData.save();
        Logger.log(
            "VOICE_XP",
            `User ${levelData.userId} earned achievements: ${newAchievements.join(", ")}`,
            "info",
        );
    }
}
