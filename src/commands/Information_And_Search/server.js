const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

const { handleError } = require("../../utils/errorHandler");
const moment = require("moment");

// Enhanced color scheme
const COLORS = {
    PRIMARY: "#5865F2",
    SUCCESS: "#57F287",
    INFO: "#3498DB",
};

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("server")
        .setDescription("Displays server information and statistics")
        .addSubcommand((subcommand) =>
            subcommand.setName("info").setDescription("Get basic information about this server"),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("stats")
                .setDescription("Get detailed server statistics")
                .addStringOption((option) =>
                    option
                        .setName("timeframe")
                        .setDescription("The timeframe to calculate stats for")
                        .setRequired(false)
                        .addChoices(
                            { name: "Last 24 Hours", value: "24h" },
                            { name: "Last 7 Days", value: "7d" },
                            { name: "Last 30 Days", value: "30d" },
                            { name: "Last Month", value: "1M" },
                            { name: "All Time", value: "all" },
                        ),
                ),
        ),
    description_full:
        'Provides comprehensive information and statistics about the server. Use "/server info" for general server details, or "/server stats" with an optional timeframe to view activity statistics.',
    usage: "/server info\n/server stats [timeframe]",
    examples: [
        "/server info",
        "/server stats",
        "/server stats timeframe: Last 24 Hours",
        "/server stats timeframe: Last 7 Days",
    ],

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === "info") {
                await sendServerInfo(interaction);
            } else if (subcommand === "stats") {
                await sendServerStats(interaction);
            }
        } catch (error) {
            handleError("Error executing server command:", error);
            await handleError(interaction, error);
        }
    },
};

async function sendServerInfo(interaction) {
    const { guild } = interaction;

    try {
        const owner = await guild.fetchOwner();
        const serverCreatedTime = Math.floor(guild.createdTimestamp / 1000);
        const serverAge = formatAge(guild.createdTimestamp);

        // Get feature flags in a readable format
        const features =
            guild.features.length > 0
                ? guild.features.map((f) => `• ${formatFeature(f)}`).join("\n")
                : "No special features";

        // Get channel counts
        const textChannels = guild.channels.cache.filter((c) => c.type === 0).size;
        const voiceChannels = guild.channels.cache.filter((c) => c.type === 2).size;
        const categoryChannels = guild.channels.cache.filter((c) => c.type === 4).size;
        const forumChannels = guild.channels.cache.filter((c) => c.type === 15).size;
        const threadChannels = guild.channels.cache.filter((c) => [11, 12].includes(c.type)).size;
        const totalChannels = guild.channels.cache.size;

        // Get member stats
        const botCount = guild.members.cache.filter((m) => m.user.bot).size;
        const humanCount = guild.memberCount - botCount;

        // Status counts
        const onlineCount = guild.members.cache.filter((m) => m.presence?.status === "online").size;
        const idleCount = guild.members.cache.filter((m) => m.presence?.status === "idle").size;
        const dndCount = guild.members.cache.filter((m) => m.presence?.status === "dnd").size;
        const offlineCount = guild.members.cache.filter(
            (m) => !m.presence || m.presence.status === "offline",
        ).size;

        // Create enhanced embed
        const embed = new EmbedBuilder()
            .setAuthor({
                name: "Server Information",
                iconURL: guild.iconURL(),
            })
            .setTitle(`🏠 ${guild.name}`)
            .setDescription(
                (guild.description ? `*${guild.description}*\n\n` : "") +
                    `${"-".repeat(40)}\n\n` +
                    `🎯 **Server ID:** \`${guild.id}\`\n` +
                    `👑 **Owner:** ${owner.user.tag}\n` +
                    `📅 **Created:** <t:${serverCreatedTime}:F>\n` +
                    `⏰ **Age:** ${serverAge}`,
            )
            .setColor(COLORS.PRIMARY)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .setImage(guild.bannerURL({ size: 1024 }) || null)
            .addFields(
                // Member stats
                {
                    name: "👥 Member Statistics",
                    value: [
                        `**Total Members:** ${guild.memberCount.toLocaleString()}`,
                        `• 👤 Humans: **${humanCount.toLocaleString()}**`,
                        `• 🤖 Bots: **${botCount.toLocaleString()}**`,
                        ``,
                        `**Online Status:**`,
                        `🟢 Online: **${onlineCount}**`,
                        `🟡 Idle: **${idleCount}**`,
                        `🔴 DND: **${dndCount}**`,
                        `⚫ Offline: **${offlineCount}**`,
                    ].join("\n"),
                    inline: true,
                },

                // Channel section
                {
                    name: "� Channels",
                    value: [
                        `**Total:** ${totalChannels}`,
                        `💬 Text: **${textChannels}**`,
                        `🔊 Voice: **${voiceChannels}**`,
                        `📂 Categories: **${categoryChannels}**`,
                        `📝 Forums: **${forumChannels}**`,
                        `🧵 Threads: **${threadChannels}**`,
                    ].join("\n"),
                    inline: true,
                },

                // Server boost & customization
                {
                    name: "✨ Boosts & Customization",
                    value: [
                        `**Boost Status:**`,
                        `📈 Tier: ${formatBoostTier(guild.premiumTier)}`,
                        `🚀 Boosts: **${guild.premiumSubscriptionCount || 0}**`,
                        ``,
                        `**Customization:**`,
                        `🎭 Roles: **${guild.roles.cache.size}**`,
                        `😀 Emojis: **${guild.emojis.cache.size}**`,
                        `🎫 Stickers: **${guild.stickers?.cache.size || 0}**`,
                    ].join("\n"),
                    inline: false,
                },

                // Security & moderation
                {
                    name: "🔒 Security & Moderation",
                    value: [
                        `🛡️ **Verification:** ${getVerificationLevelText(guild.verificationLevel)}`,
                        `🔐 **2FA Requirement:** ${getMfaLevelText(guild.mfaLevel)}`,
                        `🚫 **Content Filter:** ${getContentFilterLevel(guild.explicitContentFilter)}`,
                        `🌐 **Locale:** ${guild.preferredLocale}`,
                    ].join("\n"),
                    inline: true,
                },

                // System channels
                {
                    name: "⚙️ System Channels",
                    value: [
                        `📢 **System:** ${guild.systemChannel ? `<#${guild.systemChannel.id}>` : "None"}`,
                        `📜 **Rules:** ${guild.rulesChannel ? `<#${guild.rulesChannel.id}>` : "None"}`,
                        `😴 **AFK:** ${guild.afkChannel ? `<#${guild.afkChannel.id}>` : "None"}`,
                        `⏱️ **AFK Timeout:** ${guild.afkTimeout / 60} min`,
                    ].join("\n"),
                    inline: true,
                },
            );

        // Add server features if present
        if (guild.features.length > 0) {
            embed.addFields({
                name: "🌟 Server Features",
                value: features,
                inline: false,
            });
        }

        // Add vanity URL if present
        if (guild.vanityURLCode) {
            embed.addFields({
                name: "🔗 Custom Invite",
                value: `[discord.gg/${guild.vanityURLCode}](https://discord.gg/${guild.vanityURLCode})`,
                inline: true,
            });
        }

        embed
            .setFooter({
                text: `Requested by ${interaction.user.tag} • Server ID: ${guild.id}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        handleError("Error fetching server information:", error);
        await handleError(interaction, error);
    }
}

async function sendServerStats(interaction) {
    await interaction.deferReply();

    const { guild } = interaction;
    const timeframe = interaction.options.getString("timeframe") || "all";
    const startDate = getStartDate(timeframe);

    try {
        const stats = await collectServerStats(guild, startDate);
        const embed = createStatsEmbed(guild, timeframe, stats);
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        handleError("Error fetching server stats:", error);
        await interaction.editReply("An error occurred while fetching server statistics.");
    }
}

// Helper functions for timeframe handling
function getStartDate(timeframe) {
    switch (timeframe) {
        case "24h":
            return moment().subtract(1, "day").toDate();
        case "7d":
            return moment().subtract(7, "days").toDate();
        case "30d":
            return moment().subtract(30, "days").toDate();
        case "1M":
            return moment().subtract(1, "month").toDate();
        default:
            return new Date(0); // Beginning of time
    }
}

// Helper function to collect server stats
async function collectServerStats(guild, startDate) {
    const members = await guild.members.fetch();
    const channels = guild.channels.cache;

    // Calculate member join/leave count
    const joins = members.filter((member) => member.joinedAt >= startDate).size;

    // Get basic counts
    const stats = {
        totalMembers: guild.memberCount,
        newMembers: joins,
        humanMembers: members.filter((m) => !m.user.bot).size,
        botMembers: members.filter((m) => m.user.bot).size,
        textChannels: channels.filter((c) => c.isTextBased() && c.type !== 4).size,
        voiceChannels: channels.filter((c) => c.isVoiceBased()).size,
        categoryChannels: channels.filter((c) => c.type === 4).size,
        threadChannels: channels.filter((c) => [11, 12].includes(c.type)).size,
        roles: guild.roles.cache.size,
        emojis: guild.emojis.cache.size,
        stickers: guild.stickers?.cache.size || 0,
        messagesSent: 0,
        reactionsGiven: 0,
        voiceMinutes: 0, // Placeholder for voice activity (would need additional tracking)
        mostActiveChannel: { name: "N/A", messages: 0 },
        mostActiveMembers: [],
    };

    // Track message counts by member and channel
    const memberActivity = new Map();
    const channelActivity = new Map();

    // Process text channels
    const textChannels = channels.filter(
        (channel) => channel.isTextBased() && !channel.isThread() && channel.type !== 4,
    );
    const channelPromises = textChannels.map(async (channel) => {
        // Check permissions before fetching
        if (!channel.permissionsFor(guild.members.me).has("ReadMessageHistory")) {
            return {
                messageCount: 0,
                reactionCount: 0,
                channelId: channel.id,
                channelName: channel.name,
            };
        }

        try {
            let messageCount = 0;
            let reactionCount = 0;
            let lastId;
            let fetchMore = true;

            while (fetchMore) {
                const messages = await channel.messages
                    .fetch({
                        limit: 100,
                        before: lastId,
                    })
                    .catch(() => ({ size: 0, last: null })); // Handle potential fetch errors

                if (!messages.size) break;

                // Filter and process relevant messages
                const relevantMessages = Array.from(messages.values()).filter(
                    (msg) => msg.createdAt >= startDate,
                );

                messageCount += relevantMessages.length;

                // Process each message for reactions and member activity
                relevantMessages.forEach((msg) => {
                    // Count reactions
                    reactionCount += msg.reactions.cache.size;

                    // Track author activity
                    if (!msg.author.bot) {
                        const authorId = msg.author.id;
                        if (!memberActivity.has(authorId)) {
                            memberActivity.set(authorId, {
                                id: authorId,
                                tag: msg.author.tag,
                                messages: 1,
                            });
                        } else {
                            const userData = memberActivity.get(authorId);
                            userData.messages++;
                            memberActivity.set(authorId, userData);
                        }
                    }
                });

                // Check if we need to continue fetching
                fetchMore = messages.size === 100;
                lastId = messages.last()?.id;
            }

            // Store channel activity
            if (messageCount > 0) {
                channelActivity.set(channel.id, {
                    id: channel.id,
                    name: channel.name,
                    messages: messageCount,
                });
            }

            return {
                messageCount,
                reactionCount,
                channelId: channel.id,
                channelName: channel.name,
            };
        } catch (error) {
            console.error(`Error fetching messages from ${channel.name}:`, error);
            return {
                messageCount: 0,
                reactionCount: 0,
                channelId: channel.id,
                channelName: channel.name,
            };
        }
    });

    // Wait for all channel data collection
    const channelResults = await Promise.all(channelPromises);

    // Calculate totals and find most active channels/members
    channelResults.forEach((result) => {
        stats.messagesSent += result.messageCount;
        stats.reactionsGiven += result.reactionCount;

        // Update most active channel
        if (result.messageCount > (stats.mostActiveChannel.messages || 0)) {
            stats.mostActiveChannel = {
                name: result.channelName,
                id: result.channelId,
                messages: result.messageCount,
            };
        }
    });

    // Get most active members (top 3)
    stats.mostActiveMembers = Array.from(memberActivity.values())
        .sort((a, b) => b.messages - a.messages)
        .slice(0, 3);

    return stats;
}

function createStatsEmbed(guild, timeframe, stats) {
    // Format the description based on timeframe
    const timeframeText =
        timeframe === "all" ? "all time" : `the past ${getReadableTimeframe(timeframe)}`;

    // Calculate message rate
    let messageRate = "N/A";
    if (timeframe !== "all" && stats.messagesSent > 0) {
        const days = getTimeframeDays(timeframe);
        if (days > 0) {
            const rate = (stats.messagesSent / days).toFixed(1);
            messageRate = `${rate} msgs/day`;
        }
    }

    // Format most active members
    const activeMembers =
        stats.mostActiveMembers.length > 0
            ? stats.mostActiveMembers
                  .map((m, i) => `${getPositionEmoji(i + 1)} <@${m.id}>: ${m.messages} messages`)
                  .join("\n")
            : "No message activity recorded";

    const embed = new EmbedBuilder()
        .setTitle(`${guild.name} - Server Statistics`)
        .setColor(0x5865f2) // Discord Blurple
        .setDescription(`Statistical overview for ${timeframeText}`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
            // Member stats section
            {
                name: "👥 Member Activity",
                value: [
                    `**Total Members:** ${stats.totalMembers}`,
                    `**New Joins:** ${stats.newMembers}`,
                    `**Humans:** ${stats.humanMembers}`,
                    `**Bots:** ${stats.botMembers}`,
                ].join("\n"),
                inline: true,
            },

            // Channel stats section
            {
                name: "📊 Server Structure",
                value: [
                    `**Text Channels:** ${stats.textChannels}`,
                    `**Voice Channels:** ${stats.voiceChannels}`,
                    `**Categories:** ${stats.categoryChannels}`,
                    `**Threads:** ${stats.threadChannels}`,
                    `**Roles:** ${stats.roles}`,
                ].join("\n"),
                inline: true,
            },

            // Message stats section
            {
                name: "💬 Engagement",
                value: [
                    `**Messages Sent:** ${stats.messagesSent}`,
                    `**Message Rate:** ${messageRate}`,
                    `**Reactions Given:** ${stats.reactionsGiven}`,
                    `**Emojis Available:** ${stats.emojis}`,
                    `**Stickers Available:** ${stats.stickers}`,
                ].join("\n"),
                inline: true,
            },

            // Activity highlights section
            {
                name: "🏆 Activity Highlights",
                value: [
                    `**Most Active Channel:** ${stats.mostActiveChannel.messages > 0 ? `<#${stats.mostActiveChannel.id}> (${stats.mostActiveChannel.messages} messages)` : "No channel activity"}`,
                    "\n**Most Active Members:**",
                    activeMembers,
                ].join("\n"),
                inline: false,
            },
        )
        .setFooter({
            text: `Data collected at ${new Date().toLocaleString()}`,
            iconURL: guild.iconURL({ dynamic: true }),
        })
        .setTimestamp();

    return embed;
}

// Helper functions
function getVerificationLevelText(level) {
    const levels = {
        0: "None",
        1: "Low (Email verified)",
        2: "Medium (Registered >5m)",
        3: "High (Member >10m)",
        4: "Very High (Verified phone)",
    };
    return levels[level] || "Unknown";
}

function getMfaLevelText(level) {
    return level === 1 ? "Enabled (2FA Required)" : "Disabled (2FA Optional)";
}

function getContentFilterLevel(level) {
    const levels = {
        0: "Disabled",
        1: "Medium (No roles)",
        2: "High (Everyone)",
    };
    return levels[level] || "Unknown";
}

function formatBoostTier(tier) {
    const tiers = {
        0: "None",
        1: "Tier 1",
        2: "Tier 2",
        3: "Tier 3",
    };
    return tiers[tier] || "Unknown";
}

function formatFeature(feature) {
    const featureMap = {
        ANIMATED_BANNER: "Animated Banner",
        ANIMATED_ICON: "Animated Server Icon",
        BANNER: "Server Banner",
        COMMUNITY: "Community Server",
        DISCOVERABLE: "Server Discovery",
        FEATURABLE: "Featurable",
        INVITE_SPLASH: "Invite Splash Background",
        MEMBER_VERIFICATION_GATE_ENABLED: "Membership Screening",
        MONETIZATION_ENABLED: "Monetization",
        MORE_STICKERS: "More Sticker Slots",
        NEWS: "News Channels",
        PARTNERED: "Partnered",
        PREVIEW_ENABLED: "Preview Enabled",
        PRIVATE_THREADS: "Private Threads",
        ROLE_ICONS: "Role Icons",
        TICKETED_EVENTS_ENABLED: "Ticketed Events",
        VANITY_URL: "Vanity URL",
        VERIFIED: "Verified",
        VIP_REGIONS: "VIP Voice Regions",
        WELCOME_SCREEN_ENABLED: "Welcome Screen",
        // Add more feature mappings as needed
    };

    return featureMap[feature] || formatCamelCase(feature);
}

function formatCamelCase(str) {
    return str
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatAge(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) {
        return `${years} year${years !== 1 ? "s" : ""}, ${months % 12} month${months % 12 !== 1 ? "s" : ""}`;
    } else if (months > 0) {
        return `${months} month${months !== 1 ? "s" : ""}, ${days % 30} day${days % 30 !== 1 ? "s" : ""}`;
    } else {
        return `${days} day${days !== 1 ? "s" : ""}`;
    }
}

function getReadableTimeframe(timeframe) {
    const mapping = {
        "24h": "24 hours",
        "7d": "7 days",
        "30d": "30 days",
        "1M": "month",
        all: "all time",
    };
    return mapping[timeframe] || timeframe;
}

function getTimeframeDays(timeframe) {
    const mapping = {
        "24h": 1,
        "7d": 7,
        "30d": 30,
        "1M": 30,
        all: 0,
    };
    return mapping[timeframe] || 0;
}

function getPositionEmoji(position) {
    const emojis = {
        1: "🥇",
        2: "🥈",
        3: "🥉",
    };
    return emojis[position] || `${position}.`;
}
