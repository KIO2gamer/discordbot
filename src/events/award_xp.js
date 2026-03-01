const { Events } = require("discord.js");
const { LevelSchema } = require("../database/xp_data");
const { getGuildSettings } = require("../utils/guildCache");
const Logger = require("../utils/logger");

// XP cooldown map to prevent spam
const xpCooldowns = new Map();
// Default cooldown in milliseconds (60 seconds)
const DEFAULT_COOLDOWN = 60000;

// Periodically evict expired cooldown entries to prevent unbounded Map growth
setInterval(
    () => {
        const now = Date.now();
        for (const [key, expiresAt] of xpCooldowns) {
            if (expiresAt <= now) xpCooldowns.delete(key);
        }
    },
    5 * 60 * 1000,
); // sweep every 5 minutes

// Base XP range for each message
const XP_MIN = 15;
const XP_MAX = 25;

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bot messages, DMs, and system messages
        if (message.author.bot || !message.guild || message.system) return;

        try {
            // Check if leveling is enabled for this guild
            const guildSettings = await getGuildSettings(message.guild.id);

            // If no settings or leveling disabled, return early
            if (!guildSettings || !guildSettings.leveling || !guildSettings.leveling.enabled)
                return;

            const userId = message.author.id;
            const guildId = message.guild.id;

            // Check if user is on cooldown
            const cooldownKey = `${userId}-${guildId}`;
            if (xpCooldowns.has(cooldownKey)) {
                const cooldownEnd = xpCooldowns.get(cooldownKey);
                if (Date.now() < cooldownEnd) return;
            }

            // Set cooldown
            xpCooldowns.set(cooldownKey, Date.now() + DEFAULT_COOLDOWN);

            // Calculate XP to award, applying guild's XP rate
            const xpRate = guildSettings.leveling.xpRate || 1.0;

            // Get or create user level data
            let levelData = await LevelSchema.findOne({ userId, guildId });
            if (!levelData) {
                levelData = new LevelSchema({ userId, guildId });
            }

            // Apply daily streak bonus multiplier
            let streakBonus = 1.0;
            if (levelData.dailyStreak > 0) {
                // +5% per streak day, capped at 50% (10 day streak)
                streakBonus = 1.0 + Math.min(levelData.dailyStreak * 0.05, 0.5);
            }

            // Apply active XP boost if present
            let boostMultiplier = 1.0;
            if (
                levelData.xpBoost &&
                levelData.xpBoost.expiresAt &&
                new Date() < levelData.xpBoost.expiresAt
            ) {
                boostMultiplier = levelData.xpBoost.multiplier || 1.0;
            }

            const xpToAdd = Math.floor(
                (Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN) *
                    xpRate *
                    streakBonus *
                    boostMultiplier,
            );

            const oldLevel = levelData.level;

            // Update XP and total XP
            levelData.xp += xpToAdd;
            levelData.totalXp += xpToAdd;
            levelData.lastMessageAt = new Date();
            levelData.messageCount = (levelData.messageCount || 0) + 1;

            // Check if user leveled up
            let leveledUp = false;
            while (levelData.xp >= calculateXpForNextLevel(levelData.level)) {
                levelData.level++;
                leveledUp = true;
            }

            await levelData.save();

            // Handle level up if applicable
            if (leveledUp) {
                await handleLevelUp(message, levelData, oldLevel, guildSettings);
            }

            // Check for achievements
            await checkMessageAchievements(levelData);
        } catch (error) {
            Logger.log("LEVELS", `Error in XP system: ${error.message}`, "error");
        }
    },
};

// Helper functions
function calculateXpForNextLevel(currentLevel) {
    // 100 XP for level 1, increasing by 50 each level
    return 100 + currentLevel * 50;
}

async function checkMessageAchievements(levelData) {
    const newAchievements = [];

    // Message milestones
    if (levelData.messageCount >= 100 && !levelData.achievements.includes("messages_100")) {
        newAchievements.push("messages_100");
    }
    if (levelData.messageCount >= 1000 && !levelData.achievements.includes("messages_1000")) {
        newAchievements.push("messages_1000");
    }
    if (levelData.messageCount >= 10000 && !levelData.achievements.includes("messages_10000")) {
        newAchievements.push("messages_10000");
    }

    // Level milestones
    if (levelData.level >= 10 && !levelData.achievements.includes("level_10")) {
        newAchievements.push("level_10");
    }
    if (levelData.level >= 25 && !levelData.achievements.includes("level_25")) {
        newAchievements.push("level_25");
    }
    if (levelData.level >= 50 && !levelData.achievements.includes("level_50")) {
        newAchievements.push("level_50");
    }
    if (levelData.level >= 100 && !levelData.achievements.includes("level_100")) {
        newAchievements.push("level_100");
    }

    // Daily streak milestones
    if (levelData.dailyStreak >= 7 && !levelData.achievements.includes("streak_7days")) {
        newAchievements.push("streak_7days");
    }
    if (levelData.dailyStreak >= 30 && !levelData.achievements.includes("streak_30days")) {
        newAchievements.push("streak_30days");
    }

    if (newAchievements.length > 0) {
        levelData.achievements.push(...newAchievements);
        await levelData.save();
        Logger.log(
            "LEVELS",
            `User ${levelData.userId} earned achievements: ${newAchievements.join(", ")}`,
            "info",
        );
    }
}

async function handleLevelUp(message, levelData, oldLevel, guildSettings) {
    try {
        const newLevel = levelData.level;
        const member = message.member;

        // Handle level up message based on guild settings
        const messageType = guildSettings.leveling.levelUpMessageType || "public";
        const levelUpMessage = `🎉 Congratulations ${member}! You've leveled up to **Level ${newLevel}**!`;

        switch (messageType) {
            case "public": {
                const channelId = guildSettings.leveling.levelUpChannelId;
                const channel = channelId
                    ? message.guild.channels.cache.get(channelId)
                    : message.channel;

                if (
                    channel &&
                    channel.permissionsFor(message.guild.members.me).has("SendMessages")
                ) {
                    await channel.send(levelUpMessage);
                }
                break;
            }

            case "dm":
                try {
                    await member.send(
                        `🎉 You've leveled up to **Level ${newLevel}** in **${message.guild.name}**!`,
                    );
                } catch {
                    // User might have DMs disabled, silently fail
                }
                break;

            case "disabled":
                // No message
                break;
        }

        // Check for role rewards
        if (guildSettings.leveling.roleRewards && guildSettings.leveling.roleRewards.length > 0) {
            // Get all role rewards up to and including the current level (stacked)
            const applicableRewards = guildSettings.leveling.roleRewards.filter(
                (r) => r.level <= newLevel,
            );

            // Find which roles the user should have but doesn't
            const rolesToAdd = [];
            for (const reward of applicableRewards) {
                const role = message.guild.roles.cache.get(reward.roleId);
                if (role && !member.roles.cache.has(role.id)) {
                    rolesToAdd.push(role);
                }
            }

            // Add all missing roles
            if (rolesToAdd.length > 0 && message.guild.members.me.permissions.has("ManageRoles")) {
                try {
                    await member.roles.add(rolesToAdd, "Level reward");

                    // Notify about new roles if public messages enabled
                    if (messageType === "public") {
                        const channel = guildSettings.leveling.levelUpChannelId
                            ? message.guild.channels.cache.get(
                                  guildSettings.leveling.levelUpChannelId,
                              )
                            : message.channel;

                        if (channel) {
                            const roleNames = rolesToAdd.map((r) => `**${r.name}**`).join(", ");
                            await channel.send(
                                `🏅 ${member} has earned ${rolesToAdd.length > 1 ? "the roles" : "the role"} ${roleNames} for reaching Level ${newLevel}!`,
                            );
                        }
                    }
                } catch (error) {
                    Logger.log("LEVELS", `Error assigning role rewards: ${error.message}`, "error");
                }
            }
        }
    } catch (error) {
        Logger.log("LEVELS", `Error in level up handler: ${error.message}`, "error");
    }
}
