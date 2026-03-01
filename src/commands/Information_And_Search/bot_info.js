const { EmbedBuilder, SlashCommandBuilder, version: djsVersion } = require("discord.js");

const { formatUptime } = require("../../utils/formatUptime");
const { handleError } = require("../../utils/errorHandler");
const os = require("os");
const { version } = require("./../../../package.json");

// Enhanced color scheme
const COLORS = {
    PRIMARY: "#5865F2",
    SUCCESS: "#57F287",
    INFO: "#3498DB",
};

module.exports = {
    cooldown: 10,
    description_full:
        "Displays detailed information about the bot, including version, uptime, system statistics, and more.",
    usage: "/bot_info",
    examples: ["/bot_info"],

    data: new SlashCommandBuilder()
        .setName("bot_info")
        .setDescription("Displays information about the bot"),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const client = interaction.client;

            try {
                // Calculate uptime in seconds
                const uptimeSeconds = Math.floor(client.uptime / 1000);

                // Calculate memory usage
                const memoryUsage = process.memoryUsage();
                const memoryUsedMB = Math.round(memoryUsage.rss / 1024 / 1024);
                const memoryTotal = Math.round(os.totalmem() / 1024 / 1024);
                const memoryPercentage = ((memoryUsedMB / memoryTotal) * 100).toFixed(1);

                // Calculate CPU usage
                const cpuUsage = process.cpuUsage();
                const cpuPercentage = ((cpuUsage.user + cpuUsage.system) / 1000000).toFixed(1);
                const cpuModel = os.cpus()[0].model;
                const cpuCores = os.cpus().length;

                // Calculate guild statistics
                const totalGuilds = client.guilds.cache.size;
                const totalUsers = client.guilds.cache.reduce(
                    (acc, guild) => acc + (guild.memberCount || 0),
                    0,
                );
                const totalChannels = client.channels.cache.size;

                // Calculate command categories
                const categories = new Set(client.commands.map((cmd) => cmd.category));
                const commandsByCategory = {};
                categories.forEach((category) => {
                    commandsByCategory[category] = client.commands.filter(
                        (cmd) => cmd.category === category,
                    ).size;
                });

                // Create the enhanced embed
                const embed = new EmbedBuilder()
                    .setColor(COLORS.PRIMARY)
                    .setAuthor({
                        name: "Bot Information",
                        iconURL: client.user.displayAvatarURL(),
                    })
                    .setTitle(`🤖 ${client.user.username}`)
                    .setDescription(
                        `A powerful Discord bot with **${client.commands.size}** commands across **${categories.size}** categories.\n\n` +
                            `╭─────────────────────────────╮\n` +
                            `│ 🟢 **Status:** Online       │\n` +
                            `│ ⏱️  **Uptime:** ${formatUptime(uptimeSeconds).padEnd(12)}│\n` +
                            `│ 📊 **Servers:** ${totalGuilds.toString().padEnd(12)}│\n` +
                            `╰─────────────────────────────╯`,
                    )
                    .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
                    .addFields(
                        {
                            name: "📋 General Information",
                            value: [
                                `**Bot Name:** ${client.user.username}`,
                                `**Bot ID:** \`${client.user.id}\``,
                                `**Created:** <t:${Math.floor(client.user.createdTimestamp / 1000)}:R>`,
                                `**Version:** \`v${version}\``,
                                `**Developer:** [KIO2gamer](https://kio2gamer.carrd.co/)`,
                                `**Repository:** [GitHub](https://github.com/KIO2gamer/discordbot)`,
                            ].join("\n"),
                            inline: false,
                        },
                        {
                            name: "📊 Bot Statistics",
                            value: [
                                `🏠 **Servers:** ${totalGuilds.toLocaleString()}`,
                                `👥 **Total Users:** ${totalUsers.toLocaleString()}`,
                                `💬 **Channels:** ${totalChannels.toLocaleString()}`,
                                `⚡ **Commands:** ${client.commands.size.toLocaleString()}`,
                                ``,
                                `**📁 Commands by Category:**`,
                                ...Object.entries(commandsByCategory)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([category, count]) => `▫️ ${category}: **${count}**`),
                            ].join("\n"),
                            inline: true,
                        },
                        {
                            name: "💻 System Information",
                            value: [
                                `🖥️ **Platform:** ${process.platform} (${os.type()})`,
                                `⚙️ **CPU:** ${cpuModel.substring(0, 30)}...`,
                                `🔢 **CPU Cores:** ${cpuCores}`,
                                `📈 **CPU Usage:** ${cpuPercentage}%`,
                                ``,
                                `💾 **Memory Usage:**`,
                                `   ${memoryUsedMB}MB / ${memoryTotal}MB (${memoryPercentage}%)`,
                                ``,
                                `📦 **Node.js:** ${process.version}`,
                                `🤖 **Discord.js:** v${djsVersion}`,
                                `⏰ **OS Uptime:** ${formatUptime(Math.floor(os.uptime()))}`,
                            ].join("\n"),
                            inline: true,
                        },
                        {
                            name: "🔗 Useful Links",
                            value: [
                                `🆘 [Support Server](https://discord.gg/HF4BGwYMGm)`,
                                `➕ [Invite Bot](https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands)`,
                                `📖 [Documentation](https://github.com/KIO2gamer/project-kiyo-ARCHIVED/blob/main/README.md)`,
                                `🐛 [Report Bug](https://github.com/KIO2gamer/discordbot/issues)`,
                            ].join(" • "),
                            inline: false,
                        },
                    )
                    .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                await handleError(
                    interaction,
                    error,
                    "DATA_COLLECTION",
                    "Failed to collect system information. Some statistics may be incomplete.",
                );
            }
        } catch (error) {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while retrieving bot information.",
            );
        }
    },
};
