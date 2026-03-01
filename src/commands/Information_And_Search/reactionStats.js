const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const moment = require("moment");
const { handleError } = require("../../utils/errorHandler");

// Enhanced color scheme
const COLORS = {
    PRIMARY: "#5865F2",
    SUCCESS: "#57F287",
    INFO: "#3498DB",
    WARNING: "#FEE75C",
};

module.exports = {
    cooldown: 10,
    description_full:
        "Displays statistics on reactions used in a specific channel or across the entire server. It shows the top 5 most used reactions and the top 5 users who react the most, within a specified timeframe or for the entire server history.",
    usage: "/reaction_stats [channel] [timeframe]",
    examples: [
        "/reaction_stats",
        "/reaction_stats #general",
        "/reaction_stats #general 7d",
        "/reaction_stats 1M",
    ],

    data: new SlashCommandBuilder()
        .setName("reaction_stats")
        .setDescription(
            "Displays statistics on reactions given in a specific channel or server-wide.",
        )
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription("The channel to get reaction stats from (optional)")
                .setRequired(false),
        )
        .addStringOption((option) =>
            option
                .setName("timeframe")
                .setDescription('The timeframe to get stats for (e.g., "24h", "7d", "1M")')
                .setRequired(false)
                .addChoices(
                    { name: "Last 24 Hours", value: "24h" },
                    { name: "Last 7 Days", value: "7d" },
                    { name: "Last 30 Days", value: "30d" }, // Added more timeframe options
                    { name: "Last Month", value: "1M" }, // Use moment.js shorthand for months
                    { name: "All Time", value: "all" },
                ),
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const channel = interaction.options.getChannel("channel");
            const timeframe = interaction.options.getString("timeframe") || "7d";
            let startDate;

            // More robust timeframe handling using moment.js:
            switch (timeframe) {
                case "24h":
                    startDate = moment().subtract(1, "day").toDate();
                    break;
                case "7d":
                    startDate = moment().subtract(7, "days").toDate();
                    break;
                case "30d":
                    startDate = moment().subtract(30, "days").toDate();
                    break;
                case "1M":
                    startDate = moment().subtract(1, "month").toDate();
                    break;
                case "all":
                    startDate = new Date(0); // Beginning of time
                    break;
                default:
                    // Default to 7 days if invalid timeframe is provided
                    startDate = moment().subtract(7, "days").toDate();
            }

            const endDate = new Date();

            // Function to fetch messages and filter by timeframe:
            const getMessagesInTimeframe = async (channel) => {
                let messages = [];
                let lastMessage = null;

                // Use a loop to fetch messages in batches until all messages in the timeframe are retrieved
                do {
                    const fetchedMessages = await channel.messages.fetch({
                        limit: 100,
                        before: lastMessage?.id,
                    });
                    messages = messages.concat(fetchedMessages);
                    lastMessage = fetchedMessages.last();
                } while (
                    lastMessage &&
                    lastMessage.createdAt > startDate &&
                    messages.size <= 10000
                ); // Limit to 10,000 messages for performance

                return messages.filter(
                    (msg) => msg.createdAt >= startDate && msg.createdAt <= endDate,
                );
            };

            let messages;
            if (channel) {
                messages = await getMessagesInTimeframe(channel);
            } else {
                // Use a more efficient method to get messages from all channels
                const allMessages = await interaction.guild.channels.cache.reduce(
                    async (acc, ch) => {
                        if (ch.isTextBased()) {
                            return (await acc).concat(await getMessagesInTimeframe(ch));
                        }
                        return acc;
                    },
                    Promise.resolve([]),
                );
                messages = allMessages;
            }

            const reactionCounts = {};
            const userReactionCounts = {};

            messages.forEach((msg) => {
                msg.reactions.cache.forEach((reaction) => {
                    const emoji = reaction.emoji.name;
                    reactionCounts[emoji] = (reactionCounts[emoji] || 0) + reaction.count;

                    reaction.users.cache.forEach((user) => {
                        userReactionCounts[user.id] = (userReactionCounts[user.id] || 0) + 1;
                    });
                });
            });

            // Sort and slice to get top 5:
            const sortedReactions = Object.entries(reactionCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            const sortedUsers = Object.entries(userReactionCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            const timeframeText = timeframe === "all" ? "all time" : `the past ${timeframe}`;
            const locationText = channel ? `<#${channel.id}>` : "the entire server";

            const embed = new EmbedBuilder()
                .setAuthor({
                    name: "Reaction Statistics",
                    iconURL: interaction.guild.iconURL(),
                })
                .setTitle(`📊 Reaction Analytics`)
                .setDescription(
                    `Analyzing reactions from ${locationText} for ${timeframeText}\n` +
                        `${"-".repeat(40)}\n\n` +
                        `📈 **Total Messages Analyzed:** ${messages.size.toLocaleString()}\n` +
                        `🎭 **Unique Reactions:** ${Object.keys(reactionCounts).length}\n` +
                        `👥 **Active Reactors:** ${Object.keys(userReactionCounts).length}`,
                )
                .setColor(COLORS.PRIMARY)
                .addFields(
                    {
                        name: "🏆 Top 5 Most Used Reactions",
                        value:
                            sortedReactions.length > 0
                                ? sortedReactions
                                      .map(
                                          ([emoji, count], index) =>
                                              `${getPositionEmoji(index + 1)} ${emoji} — **${count.toLocaleString()}** uses`,
                                      )
                                      .join("\n")
                                : "❌ No reactions found in this timeframe.",
                        inline: false,
                    },
                    {
                        name: "👑 Top 5 Most Active Reactors",
                        value:
                            sortedUsers.length > 0
                                ? sortedUsers
                                      .map(
                                          ([userId, count], index) =>
                                              `${getPositionEmoji(index + 1)} <@${userId}> — **${count.toLocaleString()}** reactions`,
                                      )
                                      .join("\n")
                                : "❌ No reactors found in this timeframe.",
                        inline: false,
                    },
                )
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await handleError(
                interaction,
                error,
                "COMMAND_EXECUTION",
                "An error occurred while collecting reaction statistics.",
            );
        }
    },
};

// Helper function for position emojis
function getPositionEmoji(position) {
    const emojis = { 1: "🥇", 2: "🥈", 3: "🥉" };
    return emojis[position] || `**${position}.**`;
}
