const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    SlashCommandBuilder,
} = require("discord.js");
const mongoose = require("mongoose");

const { handleError } = require("../../utils/errorHandler");
const { formatUptime } = require("../../utils/formatUptime");

module.exports = {
    cooldown: 5,
    description_full:
        "Displays comprehensive bot health metrics including response times, WebSocket heartbeat, database connectivity, memory usage, and system information with real-time monitoring capabilities.",
    usage: "/ping",
    examples: ["/ping"],

    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check the bot's response time and connection status"),

    async execute(interaction) {
        try {
            // Initial reply to measure round-trip time
            await interaction.deferReply();
            const sent = await interaction.fetchReply();
            await this.displayPingInfo(interaction, sent);
        } catch (error) {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while checking the bot status.",
            );
        }
    },

    async displayPingInfo(interaction, sent) {
        try {
            const startTime = Date.now();

            // Measure round-trip time
            const tripTime = sent.createdTimestamp - interaction.createdTimestamp;
            const wsHeartbeat = interaction.client.ws.ping;
            const uptimeSeconds = Math.floor(interaction.client.uptime / 1000);

            // Database ping
            let dbPing = "N/A";
            let dbStatus = "⚪";
            try {
                if (mongoose.connection.readyState === 1) {
                    const dbStart = Date.now();
                    await mongoose.connection.db.admin().ping();
                    dbPing = `${Date.now() - dbStart}ms`;
                    dbStatus = "🟢";
                } else {
                    dbStatus = "🔴";
                    dbPing = "Disconnected";
                }
            } catch {
                dbStatus = "🔴";
                dbPing = "Error";
            }

            // Memory metrics
            const memUsage = process.memoryUsage();
            const memUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
            const memTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(2);

            // Bot statistics
            const guildCount = interaction.client.guilds.cache.size;
            const userCount = interaction.client.guilds.cache.reduce(
                (acc, guild) => acc + guild.memberCount,
                0,
            );
            const channelCount = interaction.client.channels.cache.size;

            // Status indicators
            const getStatusEmoji = (ms) => {
                if (ms < 100) return "🟢"; // Excellent
                if (ms < 200) return "🟡"; // Good
                if (ms < 500) return "🟠"; // Fair
                return "🔴"; // Poor
            };

            const getPerformanceRating = (ms) => {
                if (ms < 100) return "⭐ Excellent";
                if (ms < 200) return "✨ Good";
                if (ms < 500) return "⚡ Fair";
                return "⚠️ Poor";
            };

            const createProgressBar = (value, max, length = 10) => {
                const percentage = Math.min((value / max) * 100, 100);
                const filled = Math.round((percentage / 100) * length);
                const empty = length - filled;
                return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${percentage.toFixed(0)}%`;
            };

            // Determine overall color
            const avgLatency = (tripTime + wsHeartbeat) / 2;
            let embedColor = "#57F287"; // Green
            if (avgLatency >= 500)
                embedColor = "#ED4245"; // Red
            else if (avgLatency >= 200) embedColor = "#FEE75C"; // Yellow

            const embed = new EmbedBuilder()
                .setAuthor({
                    name: "Bot Health Monitor",
                    iconURL: interaction.client.user.displayAvatarURL(),
                })
                .setTitle("🏓 Pong! Connection Status")
                .setDescription(
                    `**Overall Performance:** ${getPerformanceRating(avgLatency)}\n` +
                        `${"─".repeat(40)}`,
                )
                .setColor(embedColor)
                .addFields(
                    {
                        name: "📡 Network Latency",
                        value: [
                            `${getStatusEmoji(tripTime)} **API Response:** \`${tripTime}ms\``,
                            `${getStatusEmoji(wsHeartbeat)} **WebSocket:** \`${wsHeartbeat}ms\``,
                            `${dbStatus} **Database:** \`${dbPing}\``,
                            "",
                            `**Average:** \`${avgLatency.toFixed(0)}ms\``,
                        ].join("\n"),
                        inline: true,
                    },
                    {
                        name: "💾 System Resources",
                        value: [
                            `**Memory Usage:**`,
                            `\`${memUsedMB}MB / ${memTotalMB}MB\``,
                            createProgressBar(parseFloat(memUsedMB), parseFloat(memTotalMB), 8),
                            "",
                            `**Node.js:** \`${process.version}\``,
                            `**Platform:** \`${process.platform}\``,
                        ].join("\n"),
                        inline: true,
                    },
                    {
                        name: "📊 Bot Statistics",
                        value: [
                            `**Guilds:** \`${guildCount.toLocaleString()}\``,
                            `**Users:** \`${userCount.toLocaleString()}\``,
                            `**Channels:** \`${channelCount.toLocaleString()}\``,
                            `**Commands:** \`${interaction.client.commands.size}\``,
                        ].join("\n"),
                        inline: true,
                    },
                    {
                        name: "⏱️ Uptime & Status",
                        value: [
                            `**Uptime:** ${formatUptime(uptimeSeconds)}`,
                            `**Shard ID:** ${interaction.guild?.shardId ?? "N/A"}`,
                            `**WS Status:** ${interaction.client.ws.status}`,
                            `**Process ID:** ${process.pid}`,
                        ].join("\n"),
                        inline: true,
                    },
                )
                .setFooter({
                    text: `Response time: ${Date.now() - startTime}ms • Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ping_refresh_${interaction.user.id}`)
                    .setLabel("Refresh")
                    .setEmoji("🔄")
                    .setStyle(ButtonStyle.Secondary),
            );

            await interaction.editReply({ embeds: [embed], components: [row] });

            // Create collector for refresh button
            const filter = (i) =>
                i.customId === `ping_refresh_${interaction.user.id}` &&
                i.user.id === interaction.user.id;

            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 300000, // 5 minutes
            });

            collector.on("collect", async (i) => {
                await i.deferUpdate();
                const newSent = await i.fetchReply();
                await this.displayPingInfo(i, newSent);
            });

            collector.on("end", () => {
                interaction.editReply({ components: [] }).catch(() => {});
            });
        } catch (error) {
            await handleError(
                interaction,
                error,
                "DATA_COLLECTION",
                "Failed to collect some metrics. The bot is still operational.",
            );
        }
    },
};
