const { Events, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { getAutoModConfig } = require("../utils/guildCache");
const Logger = require("../utils/logger");

// Track user message history for spam detection
const userMessageHistory = new Map();
const userJoinHistory = new Map();

// Clean up old entries every minute
setInterval(() => {
    const now = Date.now();

    // Clean message history
    for (const [userId, messages] of userMessageHistory.entries()) {
        const recentMessages = messages.filter((msg) => now - msg.timestamp < 60000);
        if (recentMessages.length === 0) {
            userMessageHistory.delete(userId);
        } else {
            userMessageHistory.set(userId, recentMessages);
        }
    }

    // Clean join history
    for (const [guildId, joins] of userJoinHistory.entries()) {
        const recentJoins = joins.filter((join) => now - join.timestamp < 60000);
        if (recentJoins.length === 0) {
            userJoinHistory.delete(guildId);
        } else {
            userJoinHistory.set(guildId, recentJoins);
        }
    }
}, 60000);

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bots and DMs
        if (message.author.bot || !message.guild) return;

        try {
            // Get auto-mod config
            const config = await getAutoModConfig(message.guild.id);

            if (!config || !config.enabled) return;

            // Check if channel or role is ignored
            if (config.ignoredChannels.includes(message.channel.id)) return;

            const member = message.member;
            if (member && config.ignoredRoles.some((roleId) => member.roles.cache.has(roleId)))
                return;

            // Check if user has admin/mod permissions (bypass auto-mod)
            if (member && member.permissions.has(PermissionFlagsBits.Administrator)) return;

            // Run checks
            await checkSpam(message, config);
            await checkMassMention(message, config);
            await checkLinks(message, config);
            await checkInvites(message, config);
            await checkBadWords(message, config);
            await checkCaps(message, config);
            await checkEmojiSpam(message, config);
        } catch (error) {
            Logger.error(`Auto-mod error: ${error.message}`);
            console.error(error);
        }
    },
};

// Spam detection
async function checkSpam(message, config) {
    if (!config.spamDetection.enabled) return;

    const userId = message.author.id;
    const guildId = message.guild.id;
    const now = Date.now();

    // Initialize or get user history
    if (!userMessageHistory.has(userId)) {
        userMessageHistory.set(userId, []);
    }

    const userMessages = userMessageHistory.get(userId);

    // Add current message
    userMessages.push({
        content: message.content,
        timestamp: now,
        guildId: guildId,
        channelId: message.channel.id,
        messageId: message.id,
    });

    // Filter messages within time window for this guild
    const recentMessages = userMessages.filter(
        (msg) => now - msg.timestamp < config.spamDetection.timeWindow && msg.guildId === guildId,
    );

    userMessageHistory.set(userId, recentMessages);

    // Check message count
    if (recentMessages.length > config.spamDetection.maxMessages) {
        await takeAction(
            message,
            config,
            config.spamDetection.action,
            "Spam Detection",
            `Sent ${recentMessages.length} messages in ${config.spamDetection.timeWindow / 1000} seconds`,
            config.spamDetection.timeoutDuration,
            config.spamDetection.deleteMessages,
        );

        // Clear messages if action taken
        if (config.spamDetection.deleteMessages) {
            await deleteRecentMessages(message, recentMessages);
        }

        userMessageHistory.set(userId, []);
        return;
    }

    // Check duplicate messages
    const duplicates = recentMessages.filter((msg) => msg.content === message.content);
    if (duplicates.length > config.spamDetection.maxDuplicates) {
        await takeAction(
            message,
            config,
            config.spamDetection.action,
            "Duplicate Spam",
            `Sent the same message ${duplicates.length} times`,
            config.spamDetection.timeoutDuration,
            config.spamDetection.deleteMessages,
        );

        if (config.spamDetection.deleteMessages) {
            await deleteRecentMessages(message, duplicates);
        }

        userMessageHistory.set(userId, []);
    }
}

// Mass mention detection
async function checkMassMention(message, config) {
    if (!config.massMention.enabled) return;

    const mentionCount = message.mentions.users.size + message.mentions.roles.size;

    if (mentionCount > config.massMention.maxMentions) {
        await takeAction(
            message,
            config,
            config.massMention.action,
            "Mass Mention",
            `Mentioned ${mentionCount} users/roles`,
            config.massMention.timeoutDuration,
            config.massMention.deleteMessages,
        );

        if (config.massMention.deleteMessages) {
            await message.delete().catch(() => {});
        }
    }
}

// Link filtering
async function checkLinks(message, config) {
    if (!config.linkFilter.enabled) return;

    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urls = message.content.match(urlRegex);

    if (urls && urls.length > 0) {
        // Check if any URL is not in whitelist
        const hasDisallowedLink = urls.some((url) => {
            try {
                const domain = new URL(url).hostname;
                return !config.linkFilter.whitelist.some((allowed) => domain.includes(allowed));
            } catch {
                return true;
            }
        });

        if (hasDisallowedLink) {
            await takeAction(
                message,
                config,
                config.linkFilter.action,
                "Unauthorized Link",
                `Posted a link not in the whitelist`,
                null,
                config.linkFilter.deleteMessages,
            );

            if (config.linkFilter.deleteMessages) {
                await message.delete().catch(() => {});
            }
        }
    }
}

// Invite link filtering
async function checkInvites(message, config) {
    if (!config.inviteFilter.enabled) return;

    const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)[^\s]+/gi;

    if (inviteRegex.test(message.content)) {
        await takeAction(
            message,
            config,
            config.inviteFilter.action,
            "Discord Invite",
            `Posted a Discord invite link`,
            null,
            config.inviteFilter.deleteMessages,
        );

        if (config.inviteFilter.deleteMessages) {
            await message.delete().catch(() => {});
        }
    }
}

// Bad words filter
async function checkBadWords(message, config) {
    if (!config.wordFilter.enabled || config.wordFilter.words.length === 0) return;

    const content = message.content.toLowerCase();
    const foundWords = config.wordFilter.words.filter((word) =>
        content.includes(word.toLowerCase()),
    );

    if (foundWords.length > 0) {
        await takeAction(
            message,
            config,
            config.wordFilter.action,
            "Inappropriate Language",
            `Used blacklisted word(s): ${foundWords.join(", ")}`,
            null,
            config.wordFilter.deleteMessages,
        );

        if (config.wordFilter.deleteMessages) {
            await message.delete().catch(() => {});
        }
    }
}

// Caps lock detection
async function checkCaps(message, config) {
    if (!config.capsFilter.enabled) return;

    const content = message.content;
    if (content.length < config.capsFilter.minLength) return;

    const letters = content.replace(/[^a-zA-Z]/g, "");
    if (letters.length === 0) return;

    const capsCount = (content.match(/[A-Z]/g) || []).length;
    const capsPercentage = (capsCount / letters.length) * 100;

    if (capsPercentage >= config.capsFilter.percentage) {
        await takeAction(
            message,
            config,
            config.capsFilter.action,
            "Excessive Caps",
            `Message was ${capsPercentage.toFixed(0)}% uppercase`,
            null,
            config.capsFilter.deleteMessages,
        );

        if (config.capsFilter.deleteMessages) {
            await message.delete().catch(() => {});
        }
    }
}

// Emoji spam detection
async function checkEmojiSpam(message, config) {
    if (!config.emojiSpam.enabled) return;

    const emojiRegex =
        /<a?:\w+:\d+>|[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const emojis = message.content.match(emojiRegex) || [];

    if (emojis.length > config.emojiSpam.maxEmojis) {
        await takeAction(
            message,
            config,
            config.emojiSpam.action,
            "Emoji Spam",
            `Used ${emojis.length} emojis`,
            null,
            config.emojiSpam.deleteMessages,
        );

        if (config.emojiSpam.deleteMessages) {
            await message.delete().catch(() => {});
        }
    }
}

// Take action against user
async function takeAction(message, config, action, reason, details, timeoutDuration, shouldDelete) {
    const member = message.member;

    try {
        switch (action) {
            case "warn":
                await member
                    .send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("#FFA500")
                                .setTitle("⚠️ Auto-Moderation Warning")
                                .setDescription(`You've been warned in **${message.guild.name}**`)
                                .addFields(
                                    { name: "Reason", value: reason },
                                    { name: "Details", value: details },
                                )
                                .setTimestamp(),
                        ],
                    })
                    .catch(() => {});
                break;

            case "timeout":
                await member.timeout(timeoutDuration, `Auto-Mod: ${reason} - ${details}`);
                break;

            case "kick":
                await member.kick(`Auto-Mod: ${reason} - ${details}`);
                break;

            case "ban":
                await member.ban({
                    reason: `Auto-Mod: ${reason} - ${details}`,
                    deleteMessageSeconds: 86400,
                });
                break;

            case "delete":
                // Just delete the message (already handled in individual checks)
                break;
        }

        // Delete the triggering message if requested
        let deleted = false;
        if (shouldDelete) {
            await message.delete().catch(() => {});
            deleted = true;
        }

        // Log action with deletion flag
        await logAction(message, config, action, reason, details, deleted);
    } catch (error) {
        Logger.error(`Failed to take auto-mod action: ${error.message}`);
    }
}

// Log auto-mod action
async function logAction(message, config, action, reason, details, wasDeleted = false) {
    if (!config.logChannelId) return;

    const logChannel = message.guild.channels.cache.get(config.logChannelId);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("🛡️ Auto-Moderation Action")
        .addFields(
            { name: "User", value: `${message.author.tag} (${message.author.id})`, inline: true },
            { name: "Action", value: action.toUpperCase(), inline: true },
            { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
            { name: "Deleted", value: wasDeleted ? "Yes" : "No", inline: true },
            { name: "Message ID", value: message.id, inline: true },
            { name: "Attachments", value: `${message.attachments.size}`, inline: true },
            { name: "Reason", value: reason, inline: false },
            { name: "Details", value: details, inline: false },
        )
        .setTimestamp();

    if (message.content) {
        embed.addFields({
            name: "Message Content",
            value: message.content.substring(0, 1000),
        });
    }

    if (message.url) {
        embed.addFields({ name: "Jump", value: `<${message.url}>`, inline: false });
    }

    await logChannel.send({ embeds: [embed] }).catch(() => {});
}

// Delete recent messages
async function deleteRecentMessages(message, messages) {
    try {
        for (const msg of messages) {
            if (msg.channelId === message.channel.id) {
                const fetchedMsg = await message.channel.messages
                    .fetch(msg.messageId)
                    .catch(() => null);
                if (fetchedMsg) {
                    await fetchedMsg.delete().catch(() => {});
                }
            }
        }
    } catch (error) {
        Logger.error(`Failed to delete messages: ${error.message}`);
    }
}

// Anti-raid detection (for member join events)
async function checkAntiRaid(member) {
    try {
        const config = await getAutoModConfig(member.guild.id);

        if (!config || !config.enabled || !config.antiRaid.enabled) return;

        const guildId = member.guild.id;
        const now = Date.now();

        if (!userJoinHistory.has(guildId)) {
            userJoinHistory.set(guildId, []);
        }

        const joins = userJoinHistory.get(guildId);
        joins.push({ userId: member.id, timestamp: now });

        // Filter recent joins within time window
        const recentJoins = joins.filter(
            (join) => now - join.timestamp < config.antiRaid.timeWindow,
        );

        userJoinHistory.set(guildId, recentJoins);

        // Check if threshold exceeded
        if (recentJoins.length > config.antiRaid.joinThreshold) {
            Logger.warn(
                `Possible raid detected in ${member.guild.name}: ${recentJoins.length} joins in ${config.antiRaid.timeWindow / 1000}s`,
            );

            // Take action on the new joiner
            if (config.antiRaid.action === "kick") {
                await member.kick("Auto-Mod: Possible raid detected");
            } else if (config.antiRaid.action === "ban") {
                await member.ban({ reason: "Auto-Mod: Possible raid detected" });
            }

            // Log anti-raid action
            if (config.logChannelId) {
                const logChannel = member.guild.channels.cache.get(config.logChannelId);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor("#FF0000")
                        .setTitle("🚨 Anti-Raid Protection Activated")
                        .setDescription(
                            `Detected ${recentJoins.length} members joining within ${config.antiRaid.timeWindow / 1000} seconds`,
                        )
                        .addFields(
                            {
                                name: "Action Taken",
                                value: `${config.antiRaid.action.toUpperCase()} on ${member.user.tag}`,
                            },
                            { name: "User ID", value: member.id },
                        )
                        .setTimestamp();

                    await logChannel.send({ embeds: [embed] }).catch(() => {});
                }
            }
        }
    } catch (error) {
        Logger.error(`Anti-raid check error: ${error.message}`);
    }
}

// Export anti-raid function for guild member add event
module.exports.checkAntiRaid = checkAntiRaid;
